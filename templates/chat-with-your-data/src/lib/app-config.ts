//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { fabricConfig } from "@/fabric.generated";

export interface SemanticModelSelection {
    alias: string;
    workspaceId: string;
    itemId: string;
}

export type SemanticModelConfiguration =
    | { status: "configured"; model: SemanticModelSelection }
    | { status: "missing"; message: string }
    | { status: "ambiguous"; message: string; aliases: string[] }
    | { status: "invalid"; message: string };

interface SemanticModelRecord {
    workspaceId: string;
    itemId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSemanticModelRecord(value: unknown): value is SemanticModelRecord {
    if (!isRecord(value)) return false;
    return (
        typeof value.workspaceId === "string" &&
        value.workspaceId.length > 0 &&
        typeof value.itemId === "string" &&
        value.itemId.length > 0
    );
}

/**
 * Selects the one semantic model used by AskPowerBI and live DAX execution.
 */
export function selectSemanticModel(
    config: unknown,
    preferredAlias?: string,
): SemanticModelConfiguration {
    if (!isRecord(config)) {
        return { status: "invalid", message: "The generated Fabric configuration is invalid." };
    }

    const semanticModels = config.semanticModels;
    if (semanticModels === undefined) {
        return {
            status: "missing",
            message: "No semantic model is configured. Add one with fabric-app-data.",
        };
    }
    if (!isRecord(semanticModels)) {
        return {
            status: "invalid",
            message: "The generated semantic model configuration is invalid.",
        };
    }

    const entries = Object.entries(semanticModels);
    const invalidAlias = entries.find(([, value]) => !isSemanticModelRecord(value))?.[0];
    if (invalidAlias) {
        return {
            status: "invalid",
            message: `Semantic model "${invalidAlias}" is missing a workspaceId or itemId.`,
        };
    }

    const models = entries.map(([alias, value]) => ({
        alias,
        ...(value as SemanticModelRecord),
    }));

    if (models.length === 0) {
        return {
            status: "missing",
            message: "No semantic model is configured. Add one with fabric-app-data.",
        };
    }

    const normalizedAlias = preferredAlias?.trim();
    if (normalizedAlias) {
        const selected = models.find((model) => model.alias === normalizedAlias);
        if (!selected) {
            return {
                status: "invalid",
                message:
                    `VITE_FABRIC_SEMANTIC_MODEL_ALIAS references "${normalizedAlias}", ` +
                    `but the configured aliases are: ${models.map((model) => model.alias).join(", ")}.`,
            };
        }
        return { status: "configured", model: selected };
    }

    if (models.length > 1) {
        return {
            status: "ambiguous",
            aliases: models.map((model) => model.alias),
            message:
                "More than one semantic model is configured. Set " +
                "VITE_FABRIC_SEMANTIC_MODEL_ALIAS to choose one.",
        };
    }

    return { status: "configured", model: models[0] };
}

export const semanticModelConfiguration = selectSemanticModel(
    fabricConfig,
    import.meta.env.VITE_FABRIC_SEMANTIC_MODEL_ALIAS,
);

export const ASK_POWERBI_STREAM_VARIANTS = [
    "AskPowerBITool.EnableStreamIntermediateResults",
    "Fabric.AskPowerBITool.EnableStreamIntermediateResults",
].join(",");
