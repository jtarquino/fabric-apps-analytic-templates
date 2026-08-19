//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/app-config", () => ({
    semanticModelConfiguration: {
        status: "missing",
        message: "No semantic model is configured.",
    },
}));

import App from "@/App";

describe("App", () => {
    it("renders a clear setup state when no model is configured", () => {
        render(<App />);
        expect(screen.getByRole("heading", { name: "Connect a semantic model" })).toBeVisible();
        expect(screen.getByText("No semantic model is configured.")).toBeVisible();
    });
});
