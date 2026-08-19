//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

export const ErrorFallback = ({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) => {
    const message = error instanceof Error ? error.message : String(error);

    // Log to the console so DevTools shows the full stack regardless of
    // environment. The styled fallback below is what users see.
    if (import.meta.env.DEV) console.error("[ErrorBoundary]", error);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-600">
            <div className="w-full max-w-md text-center">
                <h2 className="mb-200 text-500 font-semibold text-foreground">Something went wrong</h2>
                <pre className="mb-400 max-h-[var(--code-panel-height)] overflow-auto rounded-xl border border-border bg-muted p-300 text-left text-200 text-muted-foreground">
                    {message}
                </pre>
                <button
                    onClick={resetErrorBoundary}
                    className="rounded-xl border border-border px-400 py-200 text-200 text-foreground hover:bg-accent"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}
