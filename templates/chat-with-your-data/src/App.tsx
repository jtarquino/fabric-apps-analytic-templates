//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useState } from "react";
import { Database, MessageSquareText, Moon, Sparkles, Sun } from "lucide-react";
import { CopilotChat } from "@/components/copilot/copilot-chat";
import { ChatCanvas } from "@/components/dashboard/chat-canvas";
import { Button, Card } from "@/components/ui/primitives";
import type { ChatVisualRequest } from "@/hooks/use-copilot-chat";
import { useThemeContext } from "@/hooks/theme.context";
import { semanticModelConfiguration } from "@/lib/app-config";

function ConfigurationState() {
    const configuration = semanticModelConfiguration;
    const aliases = configuration.status === "ambiguous" ? configuration.aliases : [];
    const message = configuration.status === "configured" ? "" : configuration.message;

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-600">
            <Card className="w-full max-w-3xl p-700">
                <span className="mb-400 flex h-800 w-800 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <Database className="icon-size-400" />
                </span>
                <p className="text-100 font-semibold uppercase tracking-widest text-accent">
                    Configuration needed
                </p>
                <h1 className="mt-200 font-heading text-hero-800 font-semibold leading-hero-800">
                    Connect a semantic model
                </h1>
                <p className="mt-300 text-300 leading-400 text-muted-foreground">
                    {message}
                </p>
                {aliases.length > 0 && (
                    <p className="mt-200 text-200 text-muted-foreground">
                        Configured aliases: {aliases.join(", ")}
                    </p>
                )}
                <div className="mt-500 rounded-2xl bg-muted p-400">
                    <code className="font-monospace text-200 leading-300">
                        npx fabric-app-data add semanticModel myModel --from-url
                        &quot;&lt;Power BI or Fabric URL&gt;&quot;
                    </code>
                </div>
                <p className="mt-300 text-200 leading-300 text-muted-foreground">
                    Then run <code className="font-monospace">npm run dev</code>. If more than
                    one model is configured, set{" "}
                    <code className="font-monospace">VITE_FABRIC_SEMANTIC_MODEL_ALIAS</code>.
                </p>
            </Card>
        </main>
    );
}

function ConfiguredApp({
    model,
}: {
    model: { alias: string; itemId: string };
}) {
    const { isDark, toggleTheme } = useThemeContext();
    const [visual, setVisual] = useState<ChatVisualRequest>();
    const handleVisualChange = useCallback(
        (next: ChatVisualRequest | undefined) => setVisual(next),
        [],
    );

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
                <div className="mx-auto flex max-w-[var(--layout-max-width)] items-center justify-between gap-400 px-500 py-300">
                    <div className="flex min-w-0 items-center gap-300">
                        <span className="flex h-800 w-800 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                            <MessageSquareText className="icon-size-300" />
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate font-heading text-600 font-semibold leading-600">
                                Chat with your data
                            </h1>
                            <p className="truncate text-200 text-muted-foreground">
                                Live answers from <span className="font-medium">{model.alias}</span>
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={toggleTheme}
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? (
                            <Sun className="icon-size-200" />
                        ) : (
                            <Moon className="icon-size-200" />
                        )}
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-[var(--layout-max-width)] px-500 py-500">
                <div className="grid grid-cols-1 gap-500 xl:grid-cols-[minmax(0,1fr)_var(--chat-rail-width)]">
                    <section className="min-w-0" aria-label="Answer canvas">
                        {visual ? (
                            <ChatCanvas connection={model.alias} visual={visual} />
                        ) : (
                            <Card className="surface-signal min-h-[var(--empty-canvas-height)] items-center justify-center p-700 text-center">
                                <span className="flex h-800 w-800 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                                    <Sparkles className="icon-size-400" />
                                </span>
                                <p className="mt-400 text-100 font-semibold uppercase tracking-widest text-accent">
                                    Ready for a question
                                </p>
                                <h2 className="mt-200 max-w-2xl font-heading text-hero-800 font-semibold leading-hero-800">
                                    Turn a question into a live visual
                                </h2>
                                <p className="mt-300 max-w-2xl text-300 leading-400 text-muted-foreground">
                                    Ask in the conversation panel. The resulting DAX is executed
                                    against the configured model and rendered here without sample
                                    data or schema assumptions.
                                </p>
                            </Card>
                        )}
                    </section>

                    <aside className="h-[var(--chat-panel-height)] xl:sticky xl:top-[var(--sticky-offset)] xl:h-[calc(100vh-var(--sticky-offset)-var(--spacing-600))]">
                        <CopilotChat
                            artifactId={model.itemId}
                            onVisualChange={handleVisualChange}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
}

function App() {
    if (semanticModelConfiguration.status !== "configured") {
        return <ConfigurationState />;
    }

    return <ConfiguredApp model={semanticModelConfiguration.model} />;
}

export default App;
