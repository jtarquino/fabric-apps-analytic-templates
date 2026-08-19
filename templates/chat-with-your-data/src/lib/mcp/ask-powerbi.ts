//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { ASK_POWERBI_STREAM_VARIANTS } from "@/lib/app-config";
import type {
    AskPowerBIPayload,
    AskProgressEvent,
} from "@/lib/mcp/contracts";
import {
    askPowerBIThroughConnector,
    isConnectorUnavailable,
} from "@/lib/mcp/transports/connector";
import { getUdfMcpClient } from "@/lib/mcp/transports/udf-compat";

export type {
    AskPowerBIPayload,
    AskPowerBIQueryRan,
    AskProgressEvent,
} from "@/lib/mcp/contracts";

export interface AskPowerBIOptions {
    artifactId: string;
    query: string;
    context?: string;
    signal?: AbortSignal;
    onProgress?: (event: AskProgressEvent) => void;
}

interface StatusEnvelope {
    msg?: string;
    errorMessage?: string;
    events?: Array<Record<string, unknown>>;
}

const TASK_TTL_MS = 10 * 60 * 1000;
let connectorUnavailable = false;

function str(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

export function describePayloadError(payload: AskPowerBIPayload): string | undefined {
    const message = payload.Error?.Message ?? payload.error?.message;
    if (!message) return undefined;

    const status = payload.Error?.HttpStatusCode;
    const isServiceFault = payload.Error?.IsUserError === false || (status != null && status >= 500);
    const details = [
        payload.Error?.Code && payload.Error.Code !== "Unknown"
            ? `code ${payload.Error.Code}`
            : undefined,
        status ? `HTTP ${status}` : undefined,
    ]
        .filter(Boolean)
        .join(", ");

    return [
        message,
        isServiceFault ? "This is a Power BI service-side failure." : undefined,
        details ? `(${details})` : undefined,
    ]
        .filter(Boolean)
        .join(" ");
}

export function isFailedPayload(payload: AskPowerBIPayload): boolean {
    const status = payload.Status?.toLowerCase();
    return Boolean(describePayloadError(payload)) || status === "error" || status === "failed";
}

function toProgressEvent(raw: Record<string, unknown>): AskProgressEvent | undefined {
    switch (raw.type) {
        case "askpowerbi.reasoning":
            return {
                kind: "reasoning",
                header: str(raw.header),
                description: str(raw.description),
                functionName: str(raw.functionName),
            };
        case "askpowerbi.queryResult":
            return {
                kind: "queryResult",
                queryId: str(raw.queryId),
                header: str(raw.header),
                title: str(raw.title),
                description: str(raw.description),
                daxQuery: str(raw.daxQuery),
                isError: raw.isError === true,
                errorMessage: str(raw.errorMessage),
            };
        case "askpowerbi.answer":
            return { kind: "answer", answer: str(raw.answer), status: str(raw.status) };
        default:
            return undefined;
    }
}

export function parseStatusMessage(statusMessage: string): AskProgressEvent[] {
    const trimmed = statusMessage.trim();
    if (!trimmed.startsWith("{")) return [{ kind: "status", message: trimmed }];

    let envelope: StatusEnvelope;
    try {
        envelope = JSON.parse(trimmed) as StatusEnvelope;
    } catch {
        return [{ kind: "status", message: trimmed }];
    }

    const mapped = (envelope.events ?? [])
        .map(toProgressEvent)
        .filter((event): event is AskProgressEvent => Boolean(event));
    const events: AskProgressEvent[] = [];
    if (envelope.msg && mapped.length === 0) {
        events.push({ kind: "status", message: envelope.msg });
    }
    events.push(...mapped);
    if (envelope.errorMessage) {
        events.push({ kind: "status", message: envelope.errorMessage });
    }
    return events;
}

export function parsePayload(
    content: Array<{ type: string; text?: string }>,
): AskPowerBIPayload {
    for (let index = content.length - 1; index >= 0; index--) {
        const block = content[index];
        if (block.type !== "text" || !block.text) continue;
        const text = block.text.trim();
        if (!text.startsWith("{")) continue;
        try {
            const parsed = JSON.parse(text) as AskPowerBIPayload;
            if (
                "Answer" in parsed ||
                "QueriesRan" in parsed ||
                "error" in parsed ||
                "Error" in parsed
            ) {
                return parsed;
            }
        } catch {
            // The content block is prose rather than the structured payload.
        }
    }

    const fallback = content.find((block) => block.type === "text" && block.text)?.text;
    return { Answer: fallback, Status: "partial" };
}

export function parseToolResult(result: {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
}): AskPowerBIPayload {
    const payload = parsePayload(result.content ?? []);
    if (!result.isError) return payload;

    return {
        ...payload,
        Status: "error",
        error: payload.error ?? {
            message:
                describePayloadError(payload) ??
                payload.Answer ??
                "The AskPowerBI tool reported an error.",
        },
    };
}

async function askThroughUdf(options: AskPowerBIOptions): Promise<AskPowerBIPayload> {
    const { artifactId, query, context, signal, onProgress } = options;
    const client = await getUdfMcpClient();
    const seenStatus = new Set<string>();
    const stream = client.experimental.tasks.callToolStream(
        {
            name: "AskPowerBI",
            arguments: { artifactId, query, context: context ?? "" },
            _meta: { variants: ASK_POWERBI_STREAM_VARIANTS },
        },
        CallToolResultSchema,
        {
            task: { ttl: TASK_TTL_MS },
            signal,
            timeout: TASK_TTL_MS,
            maxTotalTimeout: TASK_TTL_MS,
        },
    );

    for await (const message of stream) {
        switch (message.type) {
            case "taskCreated":
                onProgress?.({ kind: "taskCreated", taskId: message.task.taskId });
                break;
            case "taskStatus": {
                if (!message.task.statusMessage) break;
                for (const event of parseStatusMessage(message.task.statusMessage)) {
                    if (event.kind === "status") {
                        if (seenStatus.has(event.message)) continue;
                        seenStatus.add(event.message);
                    }
                    onProgress?.(event);
                }
                break;
            }
            case "result":
                return parseToolResult({
                    ...message.result,
                    content: (message.result.content ?? []) as Array<{
                        type: string;
                        text?: string;
                    }>,
                });
            case "error":
                throw message.error;
        }
    }

    throw new Error("The AskPowerBI task ended without a result.");
}

/**
 * Uses the first-party connector when provisioned, with the UDF retained only
 * as a compatibility path for connector-unavailable responses.
 */
export async function askPowerBI(options: AskPowerBIOptions): Promise<AskPowerBIPayload> {
    if (!connectorUnavailable) {
        try {
            const result = await askPowerBIThroughConnector(
                {
                    artifactId: options.artifactId,
                    query: options.query,
                    context: options.context ?? "",
                    variants: ASK_POWERBI_STREAM_VARIANTS,
                },
                options.onProgress,
            );
            return result.payload;
        } catch (error) {
            if (!isConnectorUnavailable(error)) throw error;
            connectorUnavailable = true;
        }
    }

    return askThroughUdf(options);
}

export function resetConnectorAvailabilityForTests(): void {
    connectorUnavailable = false;
}
