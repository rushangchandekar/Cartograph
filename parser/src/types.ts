/**
 * Core types for the parser output.
 * This is the contract between parsing and everything downstream.
 */

export interface ParsedFile {
    /** Absolute path to the file */
    path: string;
    /** Path relative to the repository root */
    relativePath: string;
    /** Folder this file belongs to (relative to repo root) */
    folder: string;
    /** File extension */
    ext: string;
    /** Lines of code (non-empty, non-comment) */
    loc: number;
    /** Total lines */
    totalLines: number;
    /** SHA-256 hash of file contents */
    hash: string;
    /** Language detected from extension */
    language: string;
    /** Whether this file was parsed successfully */
    parsed: boolean;
    /** Reason if not parsed */
    skipReason?: string;
}

export interface ImportEdge {
    /** Source file relative path */
    from: string;
    /** Target file relative path (empty if unresolved) */
    to: string;
    /** The import specifier as written in source */
    specifier: string;
    /** Type of import */
    kind: ImportKind;
    /** Whether the target was resolved to a file in the repo */
    resolved: boolean;
    /** Reason if not resolved */
    unresolvedReason?: UnresolvedReason;
    /** Line number of the import */
    line: number;
}

export type ImportKind = "static" | "dynamic" | "reexport" | "require";

export type UnresolvedReason =
    | "external"           // Points to a package outside the repo
    | "missing"            // File doesn't exist
    | "ambiguous"          // Multiple possible targets
    | "excluded"           // Deliberately excluded (config, test, etc.)
    | "unsupported"        // Unsupported syntax (e.g., variable dynamic import)
    | "barrel_unresolved"; // Barrel file export couldn't be traced

export interface CoverageReport {
    /** Total imports seen */
    totalImports: number;
    /** Imports resolved to a file in the repo */
    resolved: number;
    /** Imports pointing outside the repo (node_modules, etc.) */
    external: number;
    /** Imports that couldn't be resolved */
    unresolved: number;
    /** Breakdown of unresolved reasons */
    unresolvedByReason: Record<UnresolvedReason, number>;
    /** Example unresolved imports (max 20) */
    unresolvedExamples: Array<{
        from: string;
        specifier: string;
        reason: UnresolvedReason;
        line: number;
    }>;
}

export interface ParseResult {
    /** Repository root path */
    rootPath: string;
    /** All files discovered */
    files: ParsedFile[];
    /** All import edges */
    edges: ImportEdge[];
    /** Coverage statistics */
    coverage: CoverageReport;
    /** Fan-in counts per file (how many files import this file) */
    fanIn: Record<string, number>;
    /** Fan-out counts per file (how many files this file imports) */
    fanOut: Record<string, number>;
    /** Timestamp of parse */
    timestamp: string;
    /** Parser version */
    parserVersion: string;
}

/** Framework adapter interface */
export interface FrameworkAdapter {
    /** Unique identifier for this adapter */
    name: string;
    /** Whether this adapter handles the given file */
    matches(filePath: string, content: string): boolean;
    /** Extract framework-specific info (routes, components, etc.) */
    analyze(file: ParsedFile, sourceFile: any): FrameworkAnalysis;
}

export interface FrameworkAnalysis {
    /** Framework-specific routes found */
    routes: FrameworkRoute[];
    /** Framework-specific roles for files */
    fileRoles: FrameworkFileRole[];
    /** Any other metadata */
    metadata: Record<string, any>;
}

export interface FrameworkRoute {
    file: string;
    framework: string;
    routeType: string;
    method?: string;
    path: string;
}

export interface FrameworkFileRole {
    file: string;
    role: string;
    confidence: number;
}

/** Configuration for the parser */
export interface ParserConfig {
    /** Repository root directory */
    rootDir: string;
    /** File extensions to parse */
    extensions: string[];
    /** Directories to exclude */
    excludeDirs: string[];
    /** Files to exclude */
    excludeFiles: string[];
    /** Maximum file size to parse (bytes) */
    maxFileSize: number;
    /** Whether to follow symlinks */
    followSymlinks: boolean;
    /** Framework adapters to use */
    adapters: FrameworkAdapter[];
}

export const DEFAULT_CONFIG: Omit<ParserConfig, "rootDir"> = {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"],
    excludeDirs: [
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        ".turbo",
        "coverage",
        ".vercel",
        ".netlify",
        "parser",
        ".kilo",
        ".claude",
        ".agents",
    ],
    excludeFiles: [
        "*.d.ts",
        "*.test.ts",
        "*.test.tsx",
        "*.spec.ts",
        "*.spec.tsx",
        "*.stories.ts",
        "*.stories.tsx",
    ],
    maxFileSize: 1024 * 1024, // 1MB
    followSymlinks: false,
    adapters: [],
};