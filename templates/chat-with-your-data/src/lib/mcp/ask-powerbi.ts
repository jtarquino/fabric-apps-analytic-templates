//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
    AskPowerBIPayload,
    AskProgressEvent,
} from "@/lib/mcp/contracts";
import { askPowerBIThroughConnector } from "@/lib/mcp/transports/connector";

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
            continue;
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

export async function askPowerBI(options: AskPowerBIOptions): Promise<AskPowerBIPayload> {
    const result = await askPowerBIThroughConnector(
        {
            artifactId: options.artifactId,
            query: options.query,
            context: options.context,
        },
        options.onProgress,
        options.signal,
    );
    if (result.isError) {
        return parseToolResult({
            content: result.content as Array<{ type: string; text?: string }>,
            isError: true,
        });
    }
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
}
