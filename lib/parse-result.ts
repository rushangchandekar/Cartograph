import { z } from "zod";

export const parsedFileSchema = z.object({
    path: z.string(),
    relativePath: z.string(),
    folder: z.string(),
    ext: z.string(),
    loc: z.number(),
    totalLines: z.number(),
    hash: z.string(),
    language: z.string(),
    parsed: z.boolean(),
    skipReason: z.string().optional(),
});

export const importEdgeSchema = z.object({
    from: z.string(),
    to: z.string(),
    specifier: z.string(),
    kind: z.enum(["static", "dynamic", "reexport", "require"]),
    resolved: z.boolean(),
    unresolvedReason: z
        .enum([
            "external",
            "missing",
            "ambiguous",
            "excluded",
            "unsupported",
            "barrel_unresolved",
        ])
        .optional(),
    line: z.number(),
});

export const coverageReportSchema = z.object({
    totalImports: z.number(),
    resolved: z.number(),
    external: z.number(),
    unresolved: z.number(),
    unresolvedByReason: z.record(
        z.enum([
            "external",
            "missing",
            "ambiguous",
            "excluded",
            "unsupported",
            "barrel_unresolved",
        ]),
        z.number()
    ),
    unresolvedExamples: z.array(
        z.object({
            from: z.string(),
            specifier: z.string(),
            reason: z.enum([
                "external",
                "missing",
                "ambiguous",
                "excluded",
                "unsupported",
                "barrel_unresolved",
            ]),
            line: z.number(),
        })
    ),
});

export const parseResultSchema = z.object({
    rootPath: z.string(),
    files: z.array(parsedFileSchema),
    edges: z.array(importEdgeSchema),
    coverage: coverageReportSchema,
    fanIn: z.record(z.string(), z.number()),
    fanOut: z.record(z.string(), z.number()),
    timestamp: z.string(),
    parserVersion: z.string(),
});

export type ParsedFile = z.infer<typeof parsedFileSchema>;
export type ImportEdge = z.infer<typeof importEdgeSchema>;
export type CoverageReport = z.infer<typeof coverageReportSchema>;
export type ParseResult = z.infer<typeof parseResultSchema>;