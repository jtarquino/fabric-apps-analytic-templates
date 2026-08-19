//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { selectSemanticModel } from "@/lib/app-config";

describe("selectSemanticModel", () => {
    it("returns a configuration state when no model exists", () => {
        expect(selectSemanticModel({})).toMatchObject({ status: "missing" });
    });

    it("selects the only generated semantic model", () => {
        expect(
            selectSemanticModel({
                semanticModels: {
                    operations: { workspaceId: "workspace-id", itemId: "item-id" },
                },
            }),
        ).toEqual({
            status: "configured",
            model: {
                alias: "operations",
                workspaceId: "workspace-id",
                itemId: "item-id",
            },
        });
    });

    it("requires an explicit alias when multiple models exist", () => {
        const result = selectSemanticModel({
            semanticModels: {
                first: { workspaceId: "workspace-1", itemId: "item-1" },
                second: { workspaceId: "workspace-2", itemId: "item-2" },
            },
        });

        expect(result).toMatchObject({
            status: "ambiguous",
            aliases: ["first", "second"],
        });
    });

    it("selects a configured alias without hardcoding its item id", () => {
        const result = selectSemanticModel(
            {
                semanticModels: {
                    first: { workspaceId: "workspace-1", itemId: "item-1" },
                    second: { workspaceId: "workspace-2", itemId: "item-2" },
                },
            },
            "second",
        );

        expect(result).toEqual({
            status: "configured",
            model: {
                alias: "second",
                workspaceId: "workspace-2",
                itemId: "item-2",
            },
        });
    });
});
