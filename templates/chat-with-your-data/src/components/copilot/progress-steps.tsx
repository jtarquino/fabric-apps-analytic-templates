//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Check, Database, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { ProgressStep } from "@/hooks/use-copilot-chat";
import { cn } from "@/lib/utils";

function StepIcon({ step }: { step: ProgressStep }) {
    if (step.isError) return <TriangleAlert className="icon-size-100 text-destructive" />;
    if (!step.done) return <Loader2 className="icon-size-100 animate-spin text-accent" />;
    if (step.kind === "queryResult") {
        return <Database className="icon-size-100 text-muted-foreground" />;
    }
    if (step.kind === "answer") return <Sparkles className="icon-size-100 text-muted-foreground" />;
    return <Check className="icon-size-100 text-muted-foreground" />;
}

export function ProgressSteps({ steps }: { steps: ProgressStep[] }) {
    if (steps.length === 0) {
        return (
            <div className="flex items-center gap-200 text-200 text-muted-foreground">
                <Loader2 className="icon-size-100 animate-spin text-accent" />
                <span className="animate-step">Starting the task...</span>
            </div>
        );
    }

    return (
        <ol className="flex flex-col gap-200 border-l border-border pl-400">
            {steps.map((step) => (
                <li key={step.id} className="grid grid-cols-[auto_1fr] gap-200">
                    <span className="flex h-400 w-400 items-center justify-center rounded-full bg-card">
                        <StepIcon step={step} />
                    </span>
                    <div>
                        <p
                            className={cn(
                                "text-[length:var(--text-200)] leading-300",
                                step.done
                                    ? "text-muted-foreground"
                                    : "animate-step font-medium text-foreground",
                                step.isError && "text-destructive",
                            )}
                        >
                            {step.title}
                        </p>
                        {step.detail && (
                            <p className="mt-100 text-100 leading-200 text-muted-foreground">
                                {step.detail}
                            </p>
                        )}
                    </div>
                </li>
            ))}
        </ol>
    );
}
