//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpDiagnostics } from "@/lib/mcp/contracts";
import { getRayfinClient } from "@/lib/rayfin-client";

const TRANSPORT_URL = new URL("https://functions.invalid/mcp");

let clientPromise: Promise<Client> | undefined;
let lastDiagnostics: McpDiagnostics | undefined;

async function toText(body: BodyInit | null | undefined): Promise<string> {
    if (body == null) return "";
    if (typeof body === "string") return body;
    if (body instanceof Blob) return body.text();
    if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
    if (ArrayBuffer.isView(body)) {
        return new TextDecoder().decode(
            new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
        );
    }
    return String(body);
}

function invokeWithAbort<T>(operation: Promise<T>, signal?: AbortSignal | null): Promise<T> {
    if (!signal) return operation;
    const abortReason = () =>
        signal.reason ??
        Object.assign(new Error("The MCP request was cancelled."), { name: "AbortError" });
    if (signal.aborted) return Promise.reject(abortReason());

    return new Promise<T>((resolve, reject) => {
        const abort = () => reject(abortReason());
        signal.addEventListener("abort", abort, { once: true });
        operation.then(resolve, reject).finally(() => {
            signal.removeEventListener("abort", abort);
        });
    });
}

const functionsFetch: typeof fetch = async (_input, init) => {
    if (init?.method && init.method.toUpperCase() !== "POST") {
        return new Response(null, { status: 405, statusText: "Method Not Allowed" });
    }

    const body = await toText(init?.body);
    if (!body) throw new Error("The MCP transport issued a request with no body.");

    const result = await invokeWithAbort(
        getRayfinClient().functions.mcpProxy.invoke({ body }),
        init?.signal,
    );
    lastDiagnostics = result.diagnostics;

    const headers = new Headers({ "Content-Type": result.contentType });
    if (result.diagnostics.rootActivityId) {
        headers.set("x-ms-root-activity-id", result.diagnostics.rootActivityId);
    }
    if (result.diagnostics.requestId) {
        headers.set("x-ms-request-id", result.diagnostics.requestId);
    }

    return new Response(result.body, { status: result.status, headers });
};

export function getLastMcpDiagnostics(): McpDiagnostics | undefined {
    return lastDiagnostics;
}

export function formatMcpDiagnostics(diagnostics = lastDiagnostics): string {
    if (!diagnostics?.rootActivityId) return "";
    const parts = [`RootActivityId: ${diagnostics.rootActivityId}`];
    if (diagnostics.routingHint) parts.push(`host: ${diagnostics.routingHint}`);
    return ` (${parts.join(" - ")})`;
}

export function getUdfMcpClient(): Promise<Client> {
    if (!clientPromise) {
        const pending = (async () => {
            const client = new Client(
                { name: "chat-with-your-data", version: "1.0.0" },
                { capabilities: {} },
            );
            const transport = new StreamableHTTPClientTransport(TRANSPORT_URL, {
                fetch: functionsFetch,
            });
            await client.connect(transport);
            return client;
        })();

        pending.catch(() => {
            if (clientPromise === pending) clientPromise = undefined;
        });
        clientPromise = pending;
    }

    return clientPromise;
}

const FRIENDLY_ERRORS: Array<[RegExp, string]> = [
    [
        /upstream_unreachable/i,
        "The compatibility function could not reach FabricAIHub. Try again shortly.",
    ],
    [
        /functionsBaseUrl|not configured|functions? (are )?not/i,
        "The FabricAIHub connector is unavailable and the compatibility function is not deployed.",
    ],
    [
        /\b401\b|unauthorized|invalid_token/i,
        "Fabric rejected your identity. Reload the app inside the Fabric portal.",
    ],
    [
        /\b403\b|forbidden/i,
        "Your account is not allowed to query this semantic model through FabricAIHub.",
    ],
];

export function describeMcpError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    for (const [pattern, message] of FRIENDLY_ERRORS) {
        if (pattern.test(raw)) return message;
    }
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
        return "The app could not reach its Rayfin backend.";
    }
    return raw + formatMcpDiagnostics();
}
