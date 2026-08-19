//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
    AskPowerBIConnectorInput,
    AskPowerBIConnectorResult,
} from "@/lib/mcp/contracts";

export interface FabricMcpConnectorClient {
    askPowerBI(input: AskPowerBIConnectorInput): Promise<AskPowerBIConnectorResult>;
}

let client: FabricMcpConnectorClient | undefined;

class ConnectorClientUnavailableError extends Error {
    readonly code = "CONNECTOR_CLIENT_UNAVAILABLE";

    constructor() {
        super("The global Fabric MCP connector client package is not available.");
        this.name = "ConnectorClientUnavailableError";
    }
}

/**
 * Installs the project-rayfin global Fabric MCP connector adapter.
 * Remove this registration seam when its published typed client is adopted.
 */
export function registerFabricMcpConnectorClient(
    connectorClient: FabricMcpConnectorClient,
): void {
    client = connectorClient;
}

export function getFabricMcpConnectorClient(): FabricMcpConnectorClient {
    if (!client) {
        throw new ConnectorClientUnavailableError();
    }

    return client;
}

export function resetFabricMcpConnectorClientForTests(): void {
    client = undefined;
}
