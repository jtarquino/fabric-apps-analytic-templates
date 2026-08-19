//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { AskProgressEvent } from "@/lib/mcp/contracts";

interface StatusEnvelope {
    msg?: string;
    errorMessage?: string;
    events?: Array<Record<string, unknown>>;
}

function str(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function toProgressEvent(raw: Record<string, unknown>): AskProgressEvent | undefined {
    switch (raw.type) {
        case "askpowerbi.reasoning":
            return {
                kind: "reasoning",
                header: str(raw.header),
                description: str(raw.description),
                functionName: str(raw.functionName),
            };
        case "askpowerbi.queryResult":
            return {
                kind: "queryResult",
                queryId: str(raw.queryId),
                header: str(raw.header),
                title: str(raw.title),
                description: str(raw.description),
                daxQuery: str(raw.daxQuery),
                isError: raw.isError === true,
                errorMessage: str(raw.errorMessage),
            };
        case "askpowerbi.answer":
            return { kind: "answer", answer: str(raw.answer), status: str(raw.status) };
        default:
            return undefined;
    }
}

export function parseStatusMessage(statusMessage: string): AskProgressEvent[] {
    const trimmed = statusMessage.trim();
    if (!trimmed.startsWith("{")) return [{ kind: "status", message: trimmed }];

    let envelope: StatusEnvelope;
    try {
        envelope = JSON.parse(trimmed) as StatusEnvelope;
    } catch {
        return [{ kind: "status", message: trimmed }];
    }

    const mapped = (envelope.events ?? [])
        .map(toProgressEvent)
        .filter((event): event is AskProgressEvent => Boolean(event));
    const events: AskProgressEvent[] = [];
    if (envelope.msg && mapped.length === 0) {
        events.push({ kind: "status", message: envelope.msg });
    }
    events.push(...mapped);
    if (envelope.errorMessage) {
        events.push({ kind: "status", message: envelope.errorMessage });
    }
    return events;
}
