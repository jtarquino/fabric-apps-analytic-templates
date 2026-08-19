//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { BarChart3, CornerDownLeft, Eraser, Send, Sparkles, Square } from "lucide-react";
import { Markdown } from "@/components/copilot/markdown";
import { ProgressSteps } from "@/components/copilot/progress-steps";
import { Button } from "@/components/ui/primitives";
import type { ChatMessage, ChatVisualRequest } from "@/hooks/use-copilot-chat";
import { useCopilotChat } from "@/hooks/use-copilot-chat";
import type { AskPowerBIQueryRan } from "@/lib/mcp/ask-powerbi";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
    "Summarize the most important trends in this model.",
    "Which categories contribute the most to the primary metric?",
    "What changed most in the latest available period?",
    "Show an unexpected pattern worth investigating.",
];

function AssistantTurn({
    message,
    onPinQuery,
}: {
    message: ChatMessage;
    onPinQuery: (query: AskPowerBIQueryRan) => void;
}) {
    const queries = message.payload?.QueriesRan ?? [];
    return (
        <div className="flex flex-col gap-300">
            <div className="flex items-center gap-200">
                <span className="flex h-600 w-600 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Sparkles className="icon-size-100" />
                </span>
                <span className="text-100 font-semibold uppercase tracking-widest text-muted-foreground">
                    Data assistant
                </span>
                {message.payload?.Status === "partial" && (
                    <span className="rounded-full bg-muted px-200 py-100-nudge text-100 text-muted-foreground">
                        partial answer
                    </span>
                )}
            </div>

            {message.status === "thinking" && <ProgressSteps steps={message.steps ?? []} />}
            {message.status !== "thinking" && (message.steps?.length ?? 0) > 0 && (
                <details>
                    <summary className="cursor-pointer text-200 text-muted-foreground hover:text-foreground">
                        {message.steps?.length} reasoning step
                        {(message.steps?.length ?? 0) === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-300">
                        <ProgressSteps steps={message.steps ?? []} />
                    </div>
                </details>
            )}
            {message.error && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-300 py-200 text-200 leading-300 text-destructive">
                    {message.error}
                </p>
            )}
            {message.text && <Markdown text={message.text} />}

            {queries.length > 0 && (
                <div className="flex flex-wrap gap-200 pt-100">
                    {queries.map((query, index) => (
                        <button
                            key={query.QueryId ?? index}
                            type="button"
                            onClick={() => onPinQuery(query)}
                            className="inline-flex max-w-full items-center gap-200 rounded-full border border-border bg-card px-300 py-100 text-200 text-muted-foreground transition-colors hover:border-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <BarChart3 className="icon-size-100 shrink-0 text-accent" />
                            <span className="truncate">
                                {query.Title ?? query.QueryId ?? `Query ${index + 1}`}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function CopilotChat({
    artifactId,
    onVisualChange,
}: {
    artifactId: string;
    onVisualChange: (visual: ChatVisualRequest | undefined) => void;
}) {
    const { messages, isBusy, visual, send, stop, clear, selectQuery } =
        useCopilotChat(artifactId);
    const [draft, setDraft] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => onVisualChange(visual), [onVisualChange, visual]);
    useEffect(() => {
        const node = scrollRef.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [messages]);

    const submit = () => {
        const text = draft.trim();
        if (!text || isBusy) return;
        setDraft("");
        void send(text);
    };

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-300 border-b border-border px-400 py-300">
                <div>
                    <p className="text-100 font-semibold uppercase tracking-widest text-accent">
                        Ask the model
                    </p>
                    <h2 className="font-heading text-500 font-semibold leading-500">
                        Conversation
                    </h2>
                </div>
                {messages.length > 0 && (
                    <Button variant="ghost" onClick={clear} title="Clear conversation">
                        <Eraser className="icon-size-200" />
                        <span className="sr-only">Clear conversation</span>
                    </Button>
                )}
            </header>

            <div ref={scrollRef} className="flex-1 space-y-500 overflow-y-auto px-400 py-400">
                {messages.length === 0 && (
                    <div className="flex flex-col gap-300">
                        <p className="text-200 leading-300 text-muted-foreground">
                            Ask a question in everyday language. FabricAIHub writes live DAX,
                            explains the result, and sends the query to the canvas.
                        </p>
                        <div className="flex flex-col gap-200">
                            {SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => void send(suggestion)}
                                    className="group flex items-center justify-between gap-300 rounded-xl border border-border bg-background px-300 py-200 text-left text-200 leading-300 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <span>{suggestion}</span>
                                    <CornerDownLeft className="icon-size-100 shrink-0 text-muted-foreground group-hover:text-accent" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) =>
                    message.role === "user" ? (
                        <div key={message.id} className="flex justify-end">
                            <p className="max-w-2xl rounded-2xl rounded-br-md bg-primary px-400 py-200 text-300 leading-400 text-primary-foreground">
                                {message.text}
                            </p>
                        </div>
                    ) : (
                        <AssistantTurn
                            key={message.id}
                            message={message}
                            onPinQuery={(query) => selectQuery(message.id, query)}
                        />
                    ),
                )}
            </div>

            <div className="border-t border-border p-300">
                <div
                    className={cn(
                        "flex items-end gap-200 rounded-2xl border border-input bg-background p-200",
                        "focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/30",
                    )}
                >
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        rows={2}
                        placeholder="Ask a question about the configured model..."
                        aria-label="Ask a question about the data"
                        className="max-h-[var(--composer-max-height)] min-h-[var(--composer-min-height)] flex-1 resize-none bg-transparent px-200 py-100 text-300 leading-400 outline-none placeholder:text-muted-foreground"
                    />
                    {isBusy ? (
                        <Button variant="outline" onClick={stop} title="Stop">
                            <Square className="icon-size-100" />
                            <span className="sr-only">Stop</span>
                        </Button>
                    ) : (
                        <Button
                            variant="accent"
                            onClick={submit}
                            disabled={!draft.trim()}
                            title="Send"
                        >
                            <Send className="icon-size-100" />
                            <span className="sr-only">Send</span>
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
