//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { isConnectorUnavailable } from "@/lib/mcp/transports/connector";

describe("isConnectorUnavailable", () => {
    it("recognizes an unprovisioned connector", () => {
        expect(isConnectorUnavailable({ code: "CONNECTOR_NOT_CONFIGURED" })).toBe(true);
        expect(isConnectorUnavailable({ code: "CONNECTOR_CLIENT_UNAVAILABLE" })).toBe(true);
        expect(
            isConnectorUnavailable({ status: 404, message: "Fabric MCP connector not found" }),
        ).toBe(true);
    });

    it("does not hide authentication or service failures behind the UDF fallback", () => {
        expect(isConnectorUnavailable({ status: 401, message: "Unauthorized" })).toBe(false);
        expect(isConnectorUnavailable({ status: 404, message: "Artifact not found" })).toBe(false);
        expect(isConnectorUnavailable({ status: 500, message: "Service unavailable" })).toBe(false);
    });
});
