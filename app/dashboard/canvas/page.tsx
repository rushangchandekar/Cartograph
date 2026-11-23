"use client";

import { useState, useEffect } from "react";
import { CanvasShell } from "@/components/canvas-shell";
import { parseResultSchema, type ParseResult } from "@/lib/parse-result";

export default function CanvasPage() {
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadParseResult() {
            try {
                const res = await fetch("/api/parse-result");
                if (!res.ok) {
                    throw new Error(`Failed to load parse result: ${res.status}`);
                }
                const data = await res.json();
                const validated = parseResultSchema.parse(data);
                setParseResult(validated);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        }
        loadParseResult();
    }, []);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                    Loading parser output...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center p-8">
                    <p className="text-sm text-red-600 dark:text-red-400 font-mono mb-2">
                        Failed to load parse result
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    if (!parseResult) {
        return null;
    }

    return <CanvasShell parseResult={parseResult} />;
}