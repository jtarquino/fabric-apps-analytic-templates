//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import {
    describePayloadError,
    isFailedPayload,
    parsePayload,
    parseStatusMessage,
    parseToolResult,
} from "@/lib/mcp/ask-powerbi";

describe("AskPowerBI response parsing", () => {
    it("extracts the structured payload from MCP content blocks", () => {
        expect(
            parsePayload([
                { type: "text", text: "Answer follows" },
                {
                    type: "text",
                    text: JSON.stringify({
                        Answer: "The answer",
                        Status: "completed",
                        QueriesRan: [{ DaxQuery: "EVALUATE ROW(\"Value\", 1)" }],
                    }),
                },
            ]),
        ).toMatchObject({
            Answer: "The answer",
            Status: "completed",
        });
    });

    it("normalizes structured task progress", () => {
        expect(
            parseStatusMessage(
                JSON.stringify({
                    events: [
                        {
                            type: "askpowerbi.queryResult",
                            title: "Running a query",
                            daxQuery: "EVALUATE ROW(\"Value\", 1)",
                        },
                    ],
                }),
            ),
        ).toEqual([
            {
                kind: "queryResult",
                title: "Running a query",
                daxQuery: "EVALUATE ROW(\"Value\", 1)",
                description: undefined,
                errorMessage: undefined,
                header: undefined,
                isError: false,
                queryId: undefined,
            },
        ]);
    });

    it("surfaces the service error shape returned by AskPowerBI", () => {
        expect(
            describePayloadError({
                Status: "error",
                Error: {
                    Message: "The service could not complete the request.",
                    HttpStatusCode: 503,
                    IsUserError: false,
                },
            }),
        ).toContain("Power BI service-side failure");
    });

    it("treats structured errors as failures even without an error status", () => {
        expect(isFailedPayload({ Error: { Message: "Model unavailable" } })).toBe(true);
        expect(isFailedPayload({ error: { message: "Try again" }, Status: "partial" })).toBe(true);
        expect(isFailedPayload({ Answer: "Ready", Status: "completed" })).toBe(false);
    });

    it("turns an MCP tool error into a failed payload", () => {
        expect(
            parseToolResult({
                isError: true,
                content: [{ type: "text", text: "The tool could not answer." }],
            }),
        ).toMatchObject({
            Status: "error",
            error: { message: "The tool could not answer." },
        });
    });
});
