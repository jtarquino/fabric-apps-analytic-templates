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

## MCP transport

The preferred path is the Rayfin Category B global FabricAIHub MCP connector.
Its platform-owned adapter invokes AppBackend `/connector-invoke` with delegated
Fabric OBO and owns the MCP task lifecycle and global endpoint configuration.
It has no workspace or item target configuration. The selected semantic-model
item ID is derived from generated Fabric config and sent only as the
`AskPowerBI` `artifactId` argument. The browser never receives a reusable Fabric
token.

Until that connector is available in the deployed Rayfin runtime, the template
contains a compatibility `mcpProxy` Fabric User Data Function. It transparently
forwards MCP JSON-RPC POST bodies with a delegated Fabric token and is isolated
under `src/lib/mcp/transports/udf-compat.ts`. Remove that adapter and
`rayfin/functions` once the connector is universally available; chat, query,
and rendering code do not depend on it.

The connector is attempted first. Only an explicit connector-unavailable
response activates the compatibility function; authentication, authorization,
and service errors are surfaced instead of being silently retried elsewhere.
The package switch is intentionally deferred until both
`@microsoft/rayfin-connector-fabric-aihub` and its matching Rayfin client are
published. `src/lib/mcp/fabric-aihub-connector.ts` mirrors the final
`askPowerBI({ artifactId, query, context? }, { onProgress, signal, ttl, timeout })`
contract and explicitly reports connector unavailability, which activates the
installable UDF compatibility path. Once published, register the stable
`fabricAiHub` instance with only `{ connector: "fabric-aihub" }`; semantic-model
IDs must remain tool arguments and never appear in connector configuration.

## Run

```powershell
npm install
npm run dev
```

The app must be opened through the Fabric portal embed flow. Use
`npm run test:fabric` for browser validation.
