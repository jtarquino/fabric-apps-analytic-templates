//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { QueryTable } from "@microsoft/fabric-app-data";
import type { VisualizationSpec } from "@microsoft/fabric-visuals";
import type { ColumnDef, DataTable } from "@microsoft/fabric-visuals-core";

export type InferredRole = "category" | "measure" | "temporal";

export interface InferredColumn extends ColumnDef {
    role: InferredRole;
    index: number;
}

export interface AutoChart {
    data: DataTable;
    spec?: VisualizationSpec;
    columns: InferredColumn[];
    scalar?: { label: string; value: number | string };
    chartType: "bar" | "line" | "arc" | "table" | "scalar";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]|$)/;

export function cleanFieldName(name: string): string {
    const cleaned = name.replace(/[.[\]\\"']/g, "").trim();
    return cleaned || name;
}

function displayNameFor(name: string): string {
    const bracketed = /\[([^\]]+)\]\s*$/.exec(name);
    return (bracketed?.[1] ?? name).trim();
}

function inferRole(values: unknown[]): InferredRole {
    const sample = values.filter((value) => value !== null && value !== undefined);
    if (sample.length === 0) return "category";
    if (sample.every((value) => typeof value === "number")) return "measure";
    if (sample.every((value) => value instanceof Date)) return "temporal";
    if (sample.every((value) => typeof value === "string" && ISO_DATE.test(value))) {
        return "temporal";
    }
    return "category";
}

function normalizeRows(rows: unknown[][]): unknown[][] {
    return rows.map((row) =>
        row.map((cell) => (cell instanceof Date ? cell.toISOString() : cell)),
    );
}

function tooltip(columns: InferredColumn[]) {
    return columns.map((column) => ({
        field: column.name,
        type:
            column.role === "measure"
                ? ("quantitative" as const)
                : column.role === "temporal"
                  ? ("temporal" as const)
                  : ("nominal" as const),
        title: column.displayName ?? column.name,
    }));
}

function buildSpec(
    columns: InferredColumn[],
    rowCount: number,
): { spec?: VisualizationSpec; chartType: AutoChart["chartType"] } {
    const measures = columns.filter((column) => column.role === "measure");
    const categories = columns.filter((column) => column.role === "category");
    const temporal = columns.filter((column) => column.role === "temporal");
    if (measures.length === 0) return { chartType: "table" };

    const measure = measures[0];
    const measureTitle = measure.displayName ?? measure.name;
    const measureAxis = {
        field: measure.name,
        type: "quantitative" as const,
        title: measureTitle,
        axis: { format: ",.3~s" },
    };

    if (temporal.length > 0) {
        const time = temporal[0];
        return {
            chartType: "line",
            spec: {
                $schema: "https://vega.github.io/schema/vega-lite/v6.json",
                data: {},
                encoding: {
                    x: {
                        field: time.name,
                        type: "temporal",
                        title: time.displayName ?? time.name,
                    },
                    y: measureAxis,
                    tooltip: tooltip(columns),
                },
                layer: [
                    { mark: { type: "area", opacity: 0.16, line: false } },
                    { mark: { type: "line", strokeWidth: 2.5, point: rowCount <= 40 } },
                ],
            } as VisualizationSpec,
        };
    }

    if (categories.length === 0) {
        return {
            chartType: rowCount === 1 && measures.length === 1 ? "scalar" : "table",
        };
    }

    const category = categories[0];
    const categoryTitle = category.displayName ?? category.name;
    if (rowCount === 1) {
        return { chartType: measures.length === 1 ? "scalar" : "table" };
    }

    if (rowCount >= 2 && rowCount <= 4 && measures.length === 1) {
        return {
            chartType: "arc",
            spec: {
                $schema: "https://vega.github.io/schema/vega-lite/v6.json",
                data: {},
                mark: { type: "arc", innerRadius: 60, padAngle: 0.015, cornerRadius: 3 },
                encoding: {
                    theta: { field: measure.name, type: "quantitative", stack: true },
                    color: {
                        field: category.name,
                        type: "nominal",
                        title: categoryTitle,
                    },
                    tooltip: tooltip(columns),
                },
            } as VisualizationSpec,
        };
    }

    return {
        chartType: "bar",
        spec: {
            $schema: "https://vega.github.io/schema/vega-lite/v6.json",
            data: {},
            mark: { type: "bar", cornerRadiusEnd: 4 },
            encoding: {
                y: {
                    field: category.name,
                    type: "nominal",
                    title: categoryTitle,
                    sort: { field: measure.name, order: "descending" },
                },
                x: measureAxis,
                tooltip: tooltip(columns),
            },
        } as VisualizationSpec,
    };
}

export function buildAutoChart(queryTable: QueryTable): AutoChart {
    const sourceRows = queryTable.rows as unknown[][];
    const rows = normalizeRows(sourceRows);
    const columns: InferredColumn[] = queryTable.columns.map((column, index) => {
        const role = inferRole(sourceRows.map((row) => row[index]));
        return {
            name: cleanFieldName(column.name),
            displayName: displayNameFor(column.name),
            format: role === "measure" ? "#,0.##" : undefined,
            role,
            index,
        };
    });

    const data: DataTable = {
        columns: columns.map(({ name, displayName, format }) => ({
            name,
            displayName,
            ...(format ? { format } : {}),
        })),
        rows: rows as DataTable["rows"],
    };
    const { spec, chartType } = buildSpec(columns, rows.length);

    let scalar: AutoChart["scalar"];
    if (chartType === "scalar" && rows.length === 1) {
        const measure = columns.find((column) => column.role === "measure");
        const category = columns.find((column) => column.role === "category");
        if (measure) {
            const value = rows[0][measure.index];
            const categoryValue = category ? rows[0][category.index] : undefined;
            const label = measure.displayName ?? measure.name;
            scalar = {
                label: categoryValue ? `${String(categoryValue)} - ${label}` : label,
                value:
                    typeof value === "number" || typeof value === "string" ? value : String(value),
            };
        }
    }

    return { data, spec, columns, chartType, scalar };
}
