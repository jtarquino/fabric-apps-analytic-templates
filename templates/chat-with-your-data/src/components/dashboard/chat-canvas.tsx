//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useMemo } from "react";
import { DataGrid } from "@microsoft/fabric-datagrid";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { Code2, Sparkles } from "lucide-react";
import { Card, CardHeader, ChartSkeleton, ErrorBanner } from "@/components/ui/primitives";
import type { ChatVisualRequest } from "@/hooks/use-copilot-chat";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { buildAutoChart } from "@/lib/auto-chart";

export function ChatCanvas({
    connection,
    visual,
}: {
    connection: string;
    visual: ChatVisualRequest;
}) {
    const theme = useCssTheme();
    const dax = visual.query.DaxQuery ?? "";
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query: dax });
    const chart = useMemo(
        () => (data?.status === "success" ? buildAutoChart(data.table) : undefined),
        [data],
    );

    return (
        <Card className="border-accent/40 ring-1 ring-accent/10">
            <CardHeader
                eyebrow="Live result"
                title={visual.query.Title ?? "Answer visual"}
                subtitle={visual.query.Description}
                actions={
                    <span className="flex h-700 w-700 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <Sparkles className="icon-size-200" />
                    </span>
                }
            />

            {!dax && (
                <p className="p-500 text-200 text-muted-foreground">
                    This answer did not run a query, so there is nothing to plot.
                </p>
            )}
            {dax && isLoading && <ChartSkeleton />}
            {dax && !isLoading && error && <ErrorBanner message={error.message} />}
            {dax && !isLoading && !error && data?.status === "error" && (
                <ErrorBanner message={data.error.message} />
            )}
            {chart && chart.data.rows.length === 0 && (
                <p className="p-500 text-200 text-muted-foreground">
                    The query completed but returned no rows.
                </p>
            )}

            {chart && chart.data.rows.length > 0 && (
                <>
                    <div className="h-[var(--chart-height)] px-400 pt-400">
                        {chart.chartType === "scalar" && chart.scalar ? (
                            <div className="flex h-full flex-col items-start justify-center gap-100">
                                <span className="text-200 uppercase tracking-widest text-muted-foreground">
                                    {chart.scalar.label}
                                </span>
                                <span className="font-numeric text-hero-900 font-bold leading-hero-900">
                                    {typeof chart.scalar.value === "number"
                                        ? chart.scalar.value.toLocaleString(undefined, {
                                              maximumFractionDigits: 2,
                                          })
                                        : chart.scalar.value}
                                </span>
                            </div>
                        ) : chart.spec ? (
                            <VegaVisual spec={chart.spec} data={chart.data} theme={theme} />
                        ) : (
                            <div className="h-full overflow-auto">
                                <DataGrid data={chart.data} theme={theme} />
                            </div>
                        )}
                    </div>

                    <details className="px-400 pb-400 pt-300">
                        <summary className="inline-flex cursor-pointer items-center gap-200 text-200 text-muted-foreground hover:text-foreground">
                            <Code2 className="icon-size-100" />
                            View the DAX behind this result
                        </summary>
                        <pre className="mt-200 max-h-[var(--code-panel-height)] overflow-auto rounded-xl bg-muted p-300 font-monospace text-100 leading-200 text-muted-foreground">
                            {dax}
                        </pre>
                    </details>
                </>
            )}
        </Card>
    );
}
