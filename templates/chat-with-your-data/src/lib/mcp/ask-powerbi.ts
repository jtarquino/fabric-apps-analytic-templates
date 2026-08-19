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
import { parseStatusMessage } from "@/lib/mcp/progress";
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
export { parseStatusMessage } from "@/lib/mcp/progress";

export interface AskPowerBIOptions {
    artifactId: string;
    query: string;
    context?: string;
    signal?: AbortSignal;
    onProgress?: (event: AskProgressEvent) => void;
}

const TASK_TTL_MS = 10 * 60 * 1000;
let connectorUnavailable = false;

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
                    context: options.context,
                },
                options.onProgress,
                options.signal,
            );
            if (
                result.structuredContent &&
                typeof result.structuredContent === "object" &&
                !Array.isArray(result.structuredContent)
            ) {
                return result.structuredContent as AskPowerBIPayload;
            }
            return parseToolResult({
                content: result.content as Array<{ type: string; text?: string }>,
            });
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
