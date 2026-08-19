//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";

const { askPowerBIThroughConnector } = vi.hoisted(() => ({
    askPowerBIThroughConnector: vi.fn(),
}));

vi.mock("@/lib/mcp/transports/connector", () => ({
    askPowerBIThroughConnector,
    isConnectorUnavailable: () => false,
}));

vi.mock("@/lib/mcp/transports/udf-compat", () => ({
    getUdfMcpClient: vi.fn(),
}));

import {
    askPowerBI,
    resetConnectorAvailabilityForTests,
} from "@/lib/mcp/ask-powerbi";

describe("AskPowerBI connector results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetConnectorAvailabilityForTests();
    });

    it("preserves the MCP isError flag when parsing connector content", async () => {
        askPowerBIThroughConnector.mockResolvedValue({
            isError: true,
            content: [{ type: "text", text: "The tool could not answer." }],
            structuredContent: {
                Answer: "This must not be treated as a successful answer.",
                Status: "completed",
            },
        });

        await expect(
            askPowerBI({
                artifactId: "model-id",
                query: "What changed?",
            }),
        ).resolves.toMatchObject({
            Status: "error",
            error: { message: "The tool could not answer." },
        });
    });
});
