//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { beforeEach, describe, expect, it, vi } from "vitest";

const { askPowerBI } = vi.hoisted(() => ({
    askPowerBI: vi.fn(),
}));

vi.mock("@/lib/mcp/fabric-aihub-connector", () => ({
    getFabricAIHubConnector: () => ({
        askPowerBI,
    }),
}));

import { askPowerBIThroughConnector } from "@/lib/mcp/transports/connector";

beforeEach(() => {
    vi.clearAllMocks();
});

describe("askPowerBIThroughConnector", () => {
    it("uses the typed helper with the selected semantic model", async () => {
        const expected = {
            content: [{ type: "text", text: "Answer" }],
            taskId: "task-1",
        };
        askPowerBI.mockResolvedValue(expected);

        const result = await askPowerBIThroughConnector({
            artifactId: "model-id",
            query: "What changed?",
            context: "Earlier question",
        });

        expect(askPowerBI).toHaveBeenCalledWith(
            {
                artifactId: "model-id",
                query: "What changed?",
                context: "Earlier question",
            },
            {
                signal: undefined,
                timeout: 600000,
                ttl: 600000,
                onProgress: expect.any(Function),
            },
        );
        expect(result).toBe(expected);
    });

    it("maps task updates to the existing progress contract", async () => {
        askPowerBI.mockImplementation(
            async (
                _input: unknown,
                options: {
                    onProgress: (task: {
                        taskId: string;
                        status: "working";
                        statusMessage: string;
                    }) => void;
                },
            ) => {
                options.onProgress({
                    taskId: "task-1",
                    status: "working",
                    statusMessage: "Reading the model",
                });
                return { content: [] };
            },
        );
        const onProgress = vi.fn();

        await askPowerBIThroughConnector(
            { artifactId: "model-id", query: "What changed?" },
            onProgress,
        );

        expect(onProgress).toHaveBeenNthCalledWith(1, {
            kind: "taskCreated",
            taskId: "task-1",
        });
        expect(onProgress).toHaveBeenNthCalledWith(2, {
            kind: "status",
            message: "Reading the model",
        });
    });
});
