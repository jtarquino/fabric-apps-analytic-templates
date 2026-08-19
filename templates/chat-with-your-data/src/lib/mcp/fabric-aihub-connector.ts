//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
    FabricAIHubResult,
    FabricAIHubTask,
} from "@microsoft/rayfin-connector-fabric-aihub";
import { getRayfinClient } from "@/lib/rayfin-client";

export type { FabricAIHubResult, FabricAIHubTask };

export function getFabricAIHubConnector() {
    return getRayfinClient().connectors.fabricAiHub;
}

export function describeMcpError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    if (/\b401\b|unauthorized|invalid_token/i.test(raw)) {
        return "Fabric rejected your identity. Reload the app inside the Fabric portal.";
    }
    if (/\b403\b|forbidden/i.test(raw)) {
        return "Your account is not allowed to query this semantic model through FabricAIHub.";
    }
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
        return "The app could not reach its Rayfin backend.";
    }
    return raw;
}
