//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { AskPowerBIConnectorInput } from "@/lib/mcp/contracts";

export type FabricAIHubTaskStatus =
    | "working"
    | "input_required"
    | "completed"
    | "failed"
    | "cancelled";

export interface FabricAIHubTask {
    taskId: string;
    status: FabricAIHubTaskStatus;
    statusMessage?: string;
}

export interface FabricAIHubResult {
    content: unknown[];
    structuredContent?: unknown;
    isError?: boolean;
    meta?: unknown;
    diagnostics?: unknown;
    taskId?: string;
}

export interface FabricAIHubAskOptions {
    onProgress?: (task: FabricAIHubTask) => void;
    signal?: AbortSignal;
    ttl?: number;
    timeout?: number;
}

export const fabricAIHubConnectorConfig = {
    connector: "fabric-aihub",
} as const;

export interface FabricAIHubConnector {
    askPowerBI(
        input: AskPowerBIConnectorInput,
        options?: FabricAIHubAskOptions,
    ): Promise<FabricAIHubResult>;
}

export class ConnectorClientUnavailableError extends Error {
    readonly code = "CONNECTOR_CLIENT_UNAVAILABLE";

    constructor() {
        super(
            "The Fabric AI Hub connector client is not available in this Rayfin release. " +
                "Upgrade to a release that publishes @microsoft/rayfin-connector-fabric-aihub " +
                "and its matching @microsoft/rayfin-client, then register the fabricAiHub connector.",
        );
        this.name = "ConnectorClientUnavailableError";
    }
}

export function getFabricAIHubConnector(): FabricAIHubConnector {
    throw new ConnectorClientUnavailableError();
}

export function describeMcpError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    if (/\b401\b|unauthorized|invalid_token/i.test(raw)) {
        return "Fabric rejected your identity. Reload the app inside the Fabric portal.";
    }
    if (/\b403\b|forbidden/i.test(raw)) {
        return "Your account is not allowed to query this semantic model through FabricAIHub.";
    }
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
        return "The app could not reach its Rayfin backend.";
    }
    return raw;
}
