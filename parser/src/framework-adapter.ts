/**
 * Framework adapter system.
 * The fallback adapter assumes no framework - returns empty results.
 */

import { FrameworkAdapter, FrameworkAnalysis, ParsedFile } from "./types.js";

/**
 * Fallback adapter - used when no framework is detected.
 * Returns empty analysis, assuming no framework-specific knowledge.
 */
export const fallbackAdapter: FrameworkAdapter = {
    name: "fallback",
    matches: () => true, // Always matches as last resort
    analyze: (): FrameworkAnalysis => ({
        routes: [],
        fileRoles: [],
        metadata: {},
    }),
};

/**
 * Register framework adapters in priority order (specific first, fallback last).
 */
export const frameworkAdapters: FrameworkAdapter[] = [
    // Specific adapters would go here (Next.js, Remix, etc.)
    fallbackAdapter,
];

/**
 * Get the appropriate adapter for a file.
 */
export function getAdapterForFile(
    file: ParsedFile,
    content: string
): FrameworkAdapter {
    for (const adapter of frameworkAdapters) {
        if (adapter.matches(file.relativePath, content)) {
            return adapter;
        }
    }
    return fallbackAdapter;
}

/**
 * Run framework analysis on all parsed files.
 */
export function analyzeFrameworks(
    files: ParsedFile[],
    readFile: (path: string) => string
): FrameworkAnalysis {
    const combined: FrameworkAnalysis = {
        routes: [],
        fileRoles: [],
        metadata: {},
    };

    for (const file of files) {
        if (!file.parsed) continue;
        try {
            const content = readFile(file.path);
            const adapter = getAdapterForFile(file, content);
            const analysis = adapter.analyze(file, null); // sourceFile would be passed in real implementation
            combined.routes.push(...analysis.routes);
            combined.fileRoles.push(...analysis.fileRoles);
            // Merge metadata
            Object.assign(combined.metadata, analysis.metadata);
        } catch (error) {
            console.warn(`Framework analysis failed for ${file.relativePath}:`, error);
        }
    }

    return combined;
}