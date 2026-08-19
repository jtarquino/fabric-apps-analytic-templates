//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useRef, useState } from "react";
import {
    askPowerBI,
    describePayloadError,
    isFailedPayload,
    type AskPowerBIPayload,
    type AskPowerBIQueryRan,
    type AskProgressEvent,
} from "@/lib/mcp/ask-powerbi";
import { describeMcpError } from "@/lib/mcp/fabric-aihub-connector";

export interface ProgressStep {
    id: string;
    kind: AskProgressEvent["kind"];
    title: string;
    detail?: string;
    daxQuery?: string;
    isError?: boolean;
    done: boolean;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    payload?: AskPowerBIPayload;
    steps?: ProgressStep[];
    status?: "thinking" | "done" | "error";
    error?: string;
    createdAt: number;
}

export interface ChatVisualRequest {
    messageId: string;
    query: AskPowerBIQueryRan;
    allQueries: AskPowerBIQueryRan[];
}

let counter = 0;
const nextId = () => `m${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function buildConversationContext(history: ChatMessage[]): string {
    const sections: string[] = [];
    for (let index = 0; index < history.length; index++) {
        const message = history[index];
        if (message.role !== "assistant" || !message.payload) continue;
        const previous = history[index - 1];
        const question = previous?.role === "user" ? previous.text : undefined;
        const queries = (message.payload.QueriesRan ?? [])
            .map((query) => {
                const lines = [`-- ${query.Title ?? query.QueryId ?? "query"}`];
                if (query.DaxQuery) lines.push(query.DaxQuery);
                if (query.Result) lines.push(`Result:\n${truncate(query.Result, 1500)}`);
                return lines.join("\n");
            })
            .join("\n\n");
        sections.push(
            [
                `### Turn ${sections.length + 1}`,
                question ? `User asked: ${question}` : undefined,
                `Assistant answered: ${message.payload.Answer ?? message.text}`,
                queries ? `DAX run for this answer:\n${queries}` : undefined,
            ]
                .filter(Boolean)
                .join("\n"),
        );
    }

    if (sections.length === 0) return "";
    return [
        "Conversation so far, oldest first. Use it only to resolve references in the new question.",
        "",
        sections.join("\n\n"),
    ].join("\n");
}

function truncate(text: string, limit: number): string {
    return text.length <= limit ? text : `${text.slice(0, limit)}\n...(truncated)`;
}

function stepFromEvent(event: AskProgressEvent): ProgressStep | undefined {
    switch (event.kind) {
        case "status":
            return { id: nextId(), kind: event.kind, title: event.message, done: false };
        case "reasoning":
            return {
                id: nextId(),
                kind: event.kind,
                title: event.header ?? event.functionName ?? "Analyzing the model",
                detail: event.description,
                done: false,
            };
        case "queryResult":
            return {
                id: nextId(),
                kind: event.kind,
                title: event.title ?? event.header ?? "Running a query",
                detail: event.description ?? event.errorMessage,
                daxQuery: event.daxQuery,
                isError: event.isError,
                done: false,
            };
        case "answer":
            return { id: nextId(), kind: event.kind, title: "Writing the answer", done: false };
        default:
            return undefined;
    }
}

export function useCopilotChat(artifactId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isBusy, setIsBusy] = useState(false);
    const [visual, setVisual] = useState<ChatVisualRequest>();
    const abortRef = useRef<AbortController | undefined>(undefined);
    const activeAssistantIdRef = useRef<string | undefined>(undefined);
    const messagesRef = useRef<ChatMessage[]>([]);

    const commitMessages = useCallback((next: (current: ChatMessage[]) => ChatMessage[]) => {
        messagesRef.current = next(messagesRef.current);
        setMessages(messagesRef.current);
    }, []);

    const updateMessage = useCallback(
        (id: string, patch: Partial<ChatMessage>) => {
            commitMessages((current) =>
                current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
            );
        },
        [commitMessages],
    );

    const send = useCallback(
        async (text: string) => {
            const question = text.trim();
            if (!question || isBusy) return;

            const userMessage: ChatMessage = {
                id: nextId(),
                role: "user",
                text: question,
                createdAt: Date.now(),
            };
            const assistantId = nextId();
            const assistantMessage: ChatMessage = {
                id: assistantId,
                role: "assistant",
                text: "",
                steps: [],
                status: "thinking",
                createdAt: Date.now(),
            };
            const history = messagesRef.current;
            commitMessages((current) => [...current, userMessage, assistantMessage]);
            setIsBusy(true);
            const controller = new AbortController();
            abortRef.current = controller;
            activeAssistantIdRef.current = assistantId;
            const steps: ProgressStep[] = [];

            try {
                const payload = await askPowerBI({
                    artifactId,
                    query: question,
                    context: buildConversationContext(history),
                    signal: controller.signal,
                    onProgress: (event) => {
                        if (abortRef.current !== controller) return;
                        if (event.kind === "taskCreated") return;
                        const step = stepFromEvent(event);
                        if (!step) return;
                        for (const previous of steps) previous.done = true;
                        steps.push(step);
                        updateMessage(assistantId, { steps: [...steps] });
                    },
                });
                if (abortRef.current !== controller) return;
                for (const step of steps) step.done = true;

                const payloadError = describePayloadError(payload);
                const failed = isFailedPayload(payload);
                updateMessage(assistantId, {
                    text: failed ? "" : (payload.Answer ?? "No answer was produced."),
                    payload,
                    steps: [...steps],
                    status: failed ? "error" : "done",
                    error: failed
                        ? (payloadError ?? payload.Answer ?? "The request failed.")
                        : undefined,
                });

                const queries = payload.QueriesRan ?? [];
                if (!failed && queries.length > 0) {
                    setVisual({
                        messageId: assistantId,
                        query: queries[queries.length - 1],
                        allQueries: queries,
                    });
                }
            } catch (error) {
                if (abortRef.current !== controller || controller.signal.aborted) return;
                for (const step of steps) step.done = true;
                updateMessage(assistantId, {
                    status: "error",
                    steps: [...steps],
                    error: describeMcpError(error),
                    text: "",
                });
            } finally {
                if (abortRef.current === controller) {
                    abortRef.current = undefined;
                    activeAssistantIdRef.current = undefined;
                    setIsBusy(false);
                }
            }
        },
        [artifactId, commitMessages, isBusy, updateMessage],
    );

    const stop = useCallback(() => {
        const assistantId = activeAssistantIdRef.current;
        abortRef.current?.abort();
        abortRef.current = undefined;
        activeAssistantIdRef.current = undefined;
        if (assistantId) {
            commitMessages((current) =>
                current.map((message) =>
                    message.id === assistantId
                        ? {
                              ...message,
                              status: "done",
                              text: "Stopped.",
                              steps: message.steps?.map((step) => ({ ...step, done: true })),
                          }
                        : message,
                ),
            );
        }
        setIsBusy(false);
    }, [commitMessages]);

    const clear = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = undefined;
        activeAssistantIdRef.current = undefined;
        messagesRef.current = [];
        setMessages([]);
        setVisual(undefined);
        setIsBusy(false);
    }, []);

    const selectQuery = useCallback((messageId: string, query: AskPowerBIQueryRan) => {
        setVisual((current) =>
            current && current.messageId === messageId ? { ...current, query } : current,
        );
    }, []);

    return { messages, isBusy, visual, send, stop, clear, selectQuery };
}
