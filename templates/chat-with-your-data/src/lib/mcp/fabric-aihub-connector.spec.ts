//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, expect, it, vi } from "vitest";

const { fabricAiHub } = vi.hoisted(() => ({
    fabricAiHub: {
        askPowerBI: vi.fn(),
    },
}));

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        connectors: { fabricAiHub },
    }),
}));

import { getFabricAIHubConnector } from "@/lib/mcp/fabric-aihub-connector";

describe("FabricAIHub connector boundary", () => {
    it("returns the configured first-party connector", () => {
        expect(getFabricAIHubConnector()).toBe(fabricAiHub);
    });
});
