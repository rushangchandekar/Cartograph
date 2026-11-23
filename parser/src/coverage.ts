/**
 * Coverage calculation and fan-in/fan-out computation.
 */

import { ImportEdge, CoverageReport, UnresolvedReason, ParseResult } from "./types.js";

export function computeCoverage(edges: ImportEdge[]): CoverageReport {
    const totalImports = edges.length;
    let resolved = 0;
    let external = 0;
    let unresolved = 0;
    const unresolvedByReason: Record<UnresolvedReason, number> = {
        external: 0,
        missing: 0,
        ambiguous: 0,
        excluded: 0,
        unsupported: 0,
        barrel_unresolved: 0,
    };
    const unresolvedExamples: CoverageReport["unresolvedExamples"] = [];

    for (const edge of edges) {
        if (edge.resolved) {
            resolved++;
        } else {
            if (edge.unresolvedReason === "external") {
                external++;
                unresolvedByReason.external++;
            } else {
                unresolved++;
                if (edge.unresolvedReason) {
                    unresolvedByReason[edge.unresolvedReason]++;
                }
            }

            // Collect examples (max 20)
            if (unresolvedExamples.length < 20 && !edge.resolved && edge.unresolvedReason !== "external") {
                unresolvedExamples.push({
                    from: edge.from,
                    specifier: edge.specifier,
                    reason: edge.unresolvedReason ?? "missing",
                    line: edge.line,
                });
            }
        }
    }

    return {
        totalImports,
        resolved,
        external,
        unresolved,
        unresolvedByReason,
        unresolvedExamples,
    };
}

export function computeFanIn(edges: ImportEdge[]): Record<string, number> {
    const fanIn: Record<string, number> = {};
    for (const edge of edges) {
        if (edge.resolved && edge.to) {
            fanIn[edge.to] = (fanIn[edge.to] ?? 0) + 1;
        }
    }
    return fanIn;
}

export function computeFanOut(edges: ImportEdge[]): Record<string, number> {
    const fanOut: Record<string, number> = {};
    for (const edge of edges) {
        fanOut[edge.from] = (fanOut[edge.from] ?? 0) + 1;
    }
    return fanOut;
}

export function deduplicateEdges(edges: ImportEdge[]): ImportEdge[] {
    const seen = new Set<string>();
    const unique: ImportEdge[] = [];

    for (const edge of edges) {
        const key = `${edge.from}|${edge.specifier}|${edge.kind}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(edge);
        }
    }

    return unique;
}