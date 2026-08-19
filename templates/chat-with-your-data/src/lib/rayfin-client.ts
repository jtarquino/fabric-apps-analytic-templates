//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { fabricAIHub, type FabricAIHub } from "@microsoft/rayfin-connector-fabric-aihub";
import { ConnectorsRayfinClient } from "@microsoft/rayfin-client/experimental";

type AppConnectorsSchema = {
    fabricAiHub: FabricAIHub;
};

const connectors = {
    fabricAiHub: {
        connector: "fabric-aihub",
    },
} as const;

type AppRayfinClient = ConnectorsRayfinClient<
    Record<string, never>,
    Record<string, never>,
    AppConnectorsSchema
>;

let _client: AppRayfinClient | undefined;

export function getRayfinClient(): AppRayfinClient {
    if (!_client) {
        const apiUrl = import.meta.env.VITE_RAYFIN_API_URL;
        const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;

        if (!apiUrl || !publishableKey) {
            throw new Error(`Missing required env vars for creating rayfin client - run 'npx rayfin up'`);
        }

        _client = new ConnectorsRayfinClient<
            Record<string, never>,
            Record<string, never>,
            AppConnectorsSchema
        >(
            {
                baseUrl: apiUrl,
                publishableKey,
                authStorage: true,
                connectors,
            },
            {
                fabricAiHub: fabricAIHub(),
            },
        );
    }

    return _client;
}