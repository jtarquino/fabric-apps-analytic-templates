//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const manifest = readFileSync(
    resolve(import.meta.dirname, "..", "rayfin-template.yml"),
    "utf8",
).replaceAll("\r\n", "\n");

describe("Rayfin template layout", () => {
    it("exposes both isolated entries with stable names and paths", () => {
        expect(manifest).toContain("- name: Data App\n      path: templates/data-app");
        expect(manifest).toContain(
            "- name: Chat with your data\n      path: templates/chat-with-your-data",
        );
    });

    it("does not scaffold the repository root as Data App", () => {
        expect(manifest).not.toMatch(/- name: Data App\s+path: \./);
    });
});
