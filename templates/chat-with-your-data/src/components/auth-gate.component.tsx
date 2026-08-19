//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { type ReactNode } from "react";

import { useAuth } from "@/hooks/auth.context";

interface AuthGateProps {
    children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
    const { isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="text-200 text-muted-foreground">
                    Connecting to Fabric…
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-600">
                <div className="w-full max-w-md text-center">
                    <h2 className="mb-200 text-500 font-semibold text-foreground">
                        Can't open this app outside Fabric
                    </h2>
                    <p className="mb-400 text-200 text-muted-foreground">
                        Opening apps connected to semantic models outside of the Fabric portal is not supported at this time.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}