//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm",
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({
    title,
    eyebrow,
    subtitle,
    actions,
}: {
    title: string;
    eyebrow?: string;
    subtitle?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-300 border-b border-border px-500 py-400">
            <div className="min-w-0">
                {eyebrow && (
                    <p className="mb-100 text-100 font-semibold uppercase tracking-widest text-accent">
                        {eyebrow}
                    </p>
                )}
                <h2 className="font-heading text-500 font-semibold leading-500 text-card-foreground">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-100 text-200 leading-300 text-muted-foreground">{subtitle}</p>
                )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-200">{actions}</div>}
        </div>
    );
}

type ButtonVariant = "primary" | "ghost" | "outline" | "accent";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    accent: "bg-accent text-accent-foreground hover:opacity-90",
    outline: "border border-border bg-card text-card-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

export function Button({
    className,
    variant = "outline",
    type = "button",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
    return (
        <button
            type={type}
            className={cn(
                "inline-flex min-h-800 items-center justify-center gap-200 rounded-full px-400 text-[length:var(--text-200)] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
                VARIANTS[variant],
                className,
            )}
            {...props}
        />
    );
}

export function ChartSkeleton() {
    return (
        <div className="flex h-[var(--chart-height)] flex-col gap-300 p-400">
            <div className="h-200 w-1/3 animate-pulse rounded-lg bg-muted" />
            <div className="grid flex-1 grid-cols-6 items-end gap-300">
                {["h-1/2", "h-3/4", "h-2/5", "h-4/5", "h-2/3", "h-5/6"].map(
                    (height) => (
                        <div
                            key={height}
                            className={cn("animate-pulse rounded-lg bg-muted", height)}
                        />
                    ),
                )}
            </div>
        </div>
    );
}

export function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="m-400 flex items-start gap-300 rounded-xl border border-destructive/40 bg-destructive/10 p-300">
            <AlertTriangle className="icon-size-200 shrink-0 text-destructive" />
            <p className="text-200 leading-300 text-destructive">{message}</p>
        </div>
    );
}
