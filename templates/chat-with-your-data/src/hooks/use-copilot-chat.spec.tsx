//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    askPowerBI: vi.fn(),
}));

vi.mock("@/lib/mcp/ask-powerbi", () => ({
    askPowerBI: mocks.askPowerBI,
    describePayloadError: vi.fn(),
    isFailedPayload: vi.fn(() => false),
}));

vi.mock("@/lib/mcp/fabric-aihub-connector", () => ({
    describeMcpError: vi.fn((error: unknown) => String(error)),
}));

import { useCopilotChat } from "./use-copilot-chat";

describe("useCopilotChat", () => {
    beforeEach(() => {
        mocks.askPowerBI.mockReset();
    });

    it("marks the active assistant message as stopped", async () => {
        mocks.askPowerBI.mockImplementation(
            ({ signal }: { signal?: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    signal?.addEventListener("abort", () => reject(signal.reason), {
                        once: true,
                    });
                }),
        );
        const { result } = renderHook(() => useCopilotChat("artifact-1"));

        act(() => {
            void result.current.send("Summarize revenue");
        });
        await waitFor(() => expect(result.current.isBusy).toBe(true));

        act(() => {
            result.current.stop();
        });

        expect(result.current.isBusy).toBe(false);
        expect(result.current.messages.at(-1)).toMatchObject({
            role: "assistant",
            status: "done",
            text: "Stopped.",
        });
    });
});
