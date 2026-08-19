//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
    AskPowerBIConnectorInput,
    AskPowerBIConnectorResult,
    AskProgressEvent,
} from "@/lib/mcp/contracts";
import { getFabricMcpConnectorClient } from "@/lib/mcp/fabric-mcp-connector";

const UNAVAILABLE_CODES = new Set([
    "CONNECTOR_NOT_FOUND",
    "CONNECTOR_NOT_CONFIGURED",
    "CONNECTOR_CLIENT_UNAVAILABLE",
    "OPERATION_NOT_FOUND",
    "NOT_IMPLEMENTED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * The compatibility function is used only when the runtime explicitly reports
 * that the first-party connector surface is unavailable.
 */
export function isConnectorUnavailable(error: unknown): boolean {
    if (!isRecord(error)) return false;

    const code = typeof error.code === "string" ? error.code : undefined;
    const message = error instanceof Error ? error.message : String(error.message ?? "");

    return (
        (code !== undefined && UNAVAILABLE_CODES.has(code)) ||
        /connector.+(?:not found|not configured|not supported)|unknown connector/i.test(message)
    );
}

export async function askPowerBIThroughConnector(
    input: AskPowerBIConnectorInput,
    onProgress?: (event: AskProgressEvent) => void,
): Promise<AskPowerBIConnectorResult> {
    const result = await getFabricMcpConnectorClient().askPowerBI(input);
    for (const event of result.progress ?? []) onProgress?.(event);
    return result;
}
