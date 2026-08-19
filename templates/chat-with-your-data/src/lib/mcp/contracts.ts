//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

export interface AskPowerBIQueryRan {
    QueryId?: string;
    DaxQuery?: string;
    Result?: string;
    RowCount?: number;
    IsRowCountCapped?: boolean;
    IsResultTruncated?: boolean;
    Title?: string;
    Description?: string;
    PatternWarnings?: string[];
}

export interface AskPowerBIPayload {
    Answer?: string;
    Status?: "completed" | "partial" | "error" | string;
    QueriesRan?: AskPowerBIQueryRan[];
    VisualsUsed?: unknown[];
    artifact_citation?: {
        ArtifactId?: string;
        Name?: string;
        Description?: string;
        Url?: string;
        IconUrl?: string;
    };
    FromVerifiedAnswer?: boolean;
    DurationMs?: number;
    error?: { message?: string; isRetryable?: boolean };
    Error?: {
        Code?: string;
        Source?: string;
        HttpStatusCode?: number;
        Message?: string;
        IsRetryable?: boolean;
        IsUserError?: boolean;
    };
}

export type AskProgressEvent =
    | { kind: "taskCreated"; taskId: string }
    | { kind: "status"; message: string }
    | { kind: "reasoning"; header?: string; description?: string; functionName?: string }
    | {
          kind: "queryResult";
          queryId?: string;
          header?: string;
          title?: string;
          description?: string;
          daxQuery?: string;
          isError?: boolean;
          errorMessage?: string;
      }
    | { kind: "answer"; answer?: string; status?: string };

export interface AskPowerBIConnectorInput {
    artifactId: string;
    query: string;
    context?: string;
}

export interface McpDiagnostics {
    rootActivityId?: string;
    requestId?: string;
    routingHint?: string;
}

export interface McpProxyResult {
    status: number;
    contentType: string;
    body: string;
    diagnostics: McpDiagnostics;
}
