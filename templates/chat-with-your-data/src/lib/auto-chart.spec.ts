//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { buildAutoChart, cleanFieldName } from "@/lib/auto-chart";

describe("buildAutoChart", () => {
    it("cleans exact DAX result names for visual fields", () => {
        expect(cleanFieldName("Model Table[Category]")).toBe("Model TableCategory");
        expect(cleanFieldName("[Total Value]")).toBe("Total Value");
    });

    it("infers a bar chart from a category and measure", () => {
        const chart = buildAutoChart({
            columns: [
                { name: "Dimension[Label]", dataType: "String" },
                { name: "[Metric]", dataType: "Double" },
            ],
            rows: [
                ["First", 10],
                ["Second", 20],
                ["Third", 30],
                ["Fourth", 40],
                ["Fifth", 50],
            ],
        });

        expect(chart.chartType).toBe("bar");
        expect(chart.data.columns.map((column) => column.name)).toEqual([
            "DimensionLabel",
            "Metric",
        ]);
    });

    it("keeps every value visible for a one-row multi-measure result", () => {
        const chart = buildAutoChart({
            columns: [
                { name: "[First metric]", dataType: "Double" },
                { name: "[Second metric]", dataType: "Double" },
            ],
            rows: [[10, 20]],
        });

        expect(chart.chartType).toBe("table");
        expect(chart.data.columns).toHaveLength(2);
    });
});
