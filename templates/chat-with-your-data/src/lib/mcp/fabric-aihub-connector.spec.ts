//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
    ConnectorClientUnavailableError,
    fabricAIHubConnectorConfig,
    getFabricAIHubConnector,
} from "@/lib/mcp/fabric-aihub-connector";

describe("FabricAIHub connector release boundary", () => {
    it("keeps target configuration global", () => {
        expect(fabricAIHubConnectorConfig).toEqual({
            connector: "fabric-aihub",
        });
    });

    it("reports explicit unavailability while the typed packages are unpublished", () => {
        expect(getFabricAIHubConnector).toThrowError(ConnectorClientUnavailableError);

        try {
            getFabricAIHubConnector();
        } catch (error) {
            expect(error).toMatchObject({
                code: "CONNECTOR_CLIENT_UNAVAILABLE",
                message: expect.stringContaining("@microsoft/rayfin-connector-fabric-aihub"),
            });
        }
    });
});
