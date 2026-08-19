# Chat with your data

This template creates a generic conversational analytics app. It sends natural
language questions to FabricAIHub `AskPowerBI`, then re-executes any returned DAX
through `@microsoft/fabric-app-data` so results render as live charts or grids.
It contains no sample model IDs, schema-specific DAX, or hardcoded business data.

## Configure a semantic model

Register one published Power BI semantic model before building:

```powershell
npx fabric-app-data add semanticModel myModel --from-url "<Power BI or Fabric URL>"
npx fabric-app-data generate -o src/fabric.generated.ts
```

You can also register explicit IDs with `-w <workspaceId> -i <itemId>`. If more
than one semantic model is configured, set `VITE_FABRIC_SEMANTIC_MODEL_ALIAS` to
the alias the chat should use. With no model, or with an ambiguous selection,
the app renders a configuration state instead of attempting a request.

## Fabric AI Hub connector

The app uses the Rayfin Category B global FabricAIHub connector. Its
platform-owned adapter invokes AppBackend `/connector-invoke` with delegated
Fabric OBO and owns the MCP task lifecycle and global endpoint configuration.
It has no workspace or item target configuration. The selected semantic-model
item ID is derived from generated Fabric config and sent only as the
`AskPowerBI` `artifactId` argument. The browser never receives a reusable Fabric
token.

The `fabricAiHub` instance has only `{ connector: "fabric-aihub" }` target
configuration. `ConnectorsRayfinClient` registers the `fabricAIHub()` runtime and
exposes the high-level
`askPowerBI({ artifactId, query, context? }, { onProgress, signal, ttl, timeout })`
helper. Semantic-model IDs remain tool arguments and never appear in connector
configuration.

This revision targets the coordinated Rayfin `1.35.0-alpha` release and remains
blocked until those package versions, including
`@microsoft/rayfin-connector-fabric-aihub`, are published.

## Run

```powershell
npm install
npm run dev
```

The app must be opened through the Fabric portal embed flow. Use
`npm run test:fabric` for browser validation.
