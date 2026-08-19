//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
        const token = match[0];
        const key = `${keyPrefix}-${index++}`;
        if (token.startsWith("**")) {
            nodes.push(
                <strong key={key} className="font-semibold text-foreground">
                    {token.slice(2, -2)}
                </strong>,
            );
        } else if (token.startsWith("`")) {
            nodes.push(
                <code key={key} className="rounded bg-muted px-100 py-100-nudge font-monospace">
                    {token.slice(1, -1)}
                </code>,
            );
        } else {
            nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
        }
        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
}

function splitTableRow(line: string): string[] {
    return line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
}

const TABLE_DIVIDER = /^\s*\|?[\s:-]+\|[\s|:-]*$/;

export function Markdown({ text }: { text: string }) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const blocks: ReactNode[] = [];
    let listItems: { ordered: boolean; content: string }[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length === 0) return;
        const key = `p-${blocks.length}`;
        blocks.push(
            <p key={key} className="text-300 leading-400 text-foreground">
                {renderInline(paragraph.join(" "), key)}
            </p>,
        );
        paragraph = [];
    };

    const flushList = () => {
        if (listItems.length === 0) return;
        const key = `l-${blocks.length}`;
        const ordered = listItems[0].ordered;
        const items = listItems.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item.content, `${key}-${itemIndex}`)}</li>
        ));
        blocks.push(
            ordered ? (
                <ol key={key} className="list-decimal space-y-100 pl-500 text-300 marker:text-accent">
                    {items}
                </ol>
            ) : (
                <ul key={key} className="list-disc space-y-100 pl-500 text-300 marker:text-accent">
                    {items}
                </ul>
            ),
        );
        listItems = [];
    };

    for (let index = 0; index < lines.length; index++) {
        const trimmed = lines[index].trim();
        if (trimmed === "") {
            flushParagraph();
            flushList();
            continue;
        }

        if (trimmed.startsWith("|") && TABLE_DIVIDER.test(lines[index + 1] ?? "")) {
            flushParagraph();
            flushList();
            const header = splitTableRow(trimmed);
            const rows: string[][] = [];
            index += 2;
            while (index < lines.length && lines[index].trim().startsWith("|")) {
                rows.push(splitTableRow(lines[index]));
                index++;
            }
            index--;
            const key = `t-${blocks.length}`;
            blocks.push(
                <div key={key} className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full border-collapse text-200">
                        <thead className="bg-muted">
                            <tr>
                                {header.map((cell, cellIndex) => (
                                    <th
                                        key={cellIndex}
                                        className="px-300 py-200 text-left font-semibold text-muted-foreground"
                                    >
                                        {cell}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-border">
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className="px-300 py-200">
                                            {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>,
            );
            continue;
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
        if (heading) {
            flushParagraph();
            flushList();
            const key = `h-${blocks.length}`;
            blocks.push(
                <h3 key={key} className="font-heading text-400 font-semibold leading-500">
                    {renderInline(heading[2], key)}
                </h3>,
            );
            continue;
        }

        const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
        if (bullet) {
            flushParagraph();
            listItems.push({ ordered: false, content: bullet[1] });
            continue;
        }
        const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
        if (numbered) {
            flushParagraph();
            listItems.push({ ordered: true, content: numbered[1] });
            continue;
        }
        flushList();
        paragraph.push(trimmed);
    }

    flushParagraph();
    flushList();
    return <div className="flex flex-col gap-300">{blocks}</div>;
}
