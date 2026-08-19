//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import {
    AudienceType,
    UserDataFunctions,
    type RayfinContext,
} from "@microsoft/fabric-user-data-functions";

const udf = new UserDataFunctions();

const DEFAULT_MCP_ENDPOINT =
    "https://api.fabric.microsoft.com/v1/mcp/fabricaihub/integrations/m365";
const UPSTREAM_TIMEOUT_MS = 120_000;
const MCP_VARIANTS = "Fabric.DisableMsitRedirect";

export interface McpDiagnostics {
    rootActivityId?: string;
    requestId?: string;
    routingHint?: string;
}

export interface McpProxyResult {
    status: number;
    contentType: string;
    body: string;
    diagnostics: McpDiagnostics;
}

/**
 * Temporary compatibility adapter for runtimes that do not yet expose the
 * first-party FabricAIHub Category B connector.
 */
udf.func(
    "mcpProxy",
    async (ctx: RayfinContext, body: string): Promise<McpProxyResult> => {
        const endpoint = ctx.getSecret("MCP_ENDPOINT") ?? DEFAULT_MCP_ENDPOINT;
        const token = ctx.getToken(AudienceType.Fabric);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: ["Bearer", token].join(" "),
                    "Content-Type": "application/json",
                    Accept: "application/json, text/event-stream",
                    "X-Variants": MCP_VARIANTS,
                },
                body,
                signal: controller.signal,
            });
            const responseBody = await response.text();
            const diagnostics: McpDiagnostics = {
                rootActivityId: response.headers.get("x-ms-root-activity-id") ?? undefined,
                requestId: response.headers.get("requestid") ?? undefined,
                routingHint: response.headers.get("x-ms-routing-hint") ?? undefined,
            };

            if (
                !response.ok ||
                /"isError"\s*:\s*true|"status"\s*:\s*"failed"/.test(responseBody)
            ) {
                console.error(
                    `FabricAIHub MCP request failed (status ${response.status}, ` +
                        `rootActivityId ${diagnostics.rootActivityId ?? "n/a"}, ` +
                        `requestId ${diagnostics.requestId ?? "n/a"}).`,
                );
            }

            return {
                status: response.status,
                contentType: response.headers.get("content-type") ?? "application/json",
                body: responseBody,
                diagnostics,
            };
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.error(`FabricAIHub MCP request failed: ${reason}`);
            throw new Error(`upstream_unreachable: ${reason}`);
        } finally {
            clearTimeout(timeout);
        }
    },
    [udf.connection({ audienceType: AudienceType.Fabric })],
);
