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

/**
 * Release-safe boundary matching the unpublished first-party connector helper.
 * Replace this interface with the package marker when both packages are available.
 */
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
            "The Fabric AI Hub connector requires the unpublished connector package and matching Rayfin client.",
        );
        this.name = "ConnectorClientUnavailableError";
    }
}

/**
 * The connector implementation is deliberately unavailable until its packages
 * are published. The caller will use the installable UDF compatibility path.
 */
export function getFabricAIHubConnector(): FabricAIHubConnector {
    throw new ConnectorClientUnavailableError();
}
