/**
 * File discovery and filtering.
 * Structural selection — walks from entry points or keeps whole directories.
 */

import * as fs from "fs";
import * as path from "path";
import { minimatch } from "minimatch";
import { ParsedFile, ParserConfig, DEFAULT_CONFIG } from "./types.js";
import { createHash } from "crypto";

export function createConfig(rootDir: string, overrides?: Partial<ParserConfig>): ParserConfig {
    return {
        rootDir,
        ...DEFAULT_CONFIG,
        ...overrides,
    };
}

function shouldExclude(relPath: string, config: ParserConfig): boolean {
    // Check exclude directories
    for (const dir of config.excludeDirs) {
        if (relPath.startsWith(dir + "/") || relPath.startsWith(dir + "\\") || relPath === dir) {
            return true;
        }
    }

    // Check exclude file patterns
    for (const pattern of config.excludeFiles) {
        if (minimatch(relPath, pattern, { dot: true })) {
            return true;
        }
    }

    return false;
}

function isSupportedExtension(filePath: string, config: ParserConfig): boolean {
    const ext = path.extname(filePath);
    return config.extensions.includes(ext);
}

function getLanguageFromExt(ext: string): string {
    switch (ext) {
        case ".ts": return "typescript";
        case ".tsx": return "typescript";
        case ".js": return "javascript";
        case ".jsx": return "javascript";
        case ".mjs": return "javascript";
        case ".cjs": return "javascript";
        case ".vue": return "vue";
        case ".svelte": return "svelte";
        default: return "unknown";
    }
}

function countLines(content: string): { loc: number; totalLines: number } {
    const lines = content.split("\n");
    let loc = 0;
    let inBlockComment = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("//")) continue;
        if (trimmed.startsWith("/*") && trimmed.endsWith("*/")) continue;
        if (trimmed.startsWith("/*")) {
            inBlockComment = true;
            continue;
        }
        if (trimmed.endsWith("*/")) {
            inBlockComment = false;
            continue;
        }
        if (inBlockComment) continue;
        loc++;
    }

    return { loc, totalLines: lines.length };
}

export function walkRepository(config: ParserConfig): ParsedFile[] {
    const files: ParsedFile[] = [];
    const rootDir = path.resolve(config.rootDir);

    function walk(dir: string): void {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(rootDir, fullPath);

            if (shouldExclude(relPath, config)) {
                continue;
            }

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && isSupportedExtension(fullPath, config)) {
                const stat = fs.statSync(fullPath);
                if (stat.size > config.maxFileSize) {
                    files.push({
                        path: fullPath,
                        relativePath: relPath,
                        folder: path.dirname(relPath) || ".",
                        ext: path.extname(fullPath),
                        loc: 0,
                        totalLines: 0,
                        hash: "",
                        language: getLanguageFromExt(path.extname(fullPath)),
                        parsed: false,
                        skipReason: `File too large (${stat.size} bytes)`,
                    });
                    continue;
                }

                const content = fs.readFileSync(fullPath, "utf-8");
                const hash = createHash("sha256").update(content).digest("hex");
                const { loc, totalLines } = countLines(content);

                files.push({
                    path: fullPath,
                    relativePath: relPath,
                    folder: path.dirname(relPath) || ".",
                    ext: path.extname(fullPath),
                    loc,
                    totalLines,
                    hash,
                    language: getLanguageFromExt(path.extname(fullPath)),
                    parsed: true,
                });
            }
        }
    }

    walk(rootDir);
    return files;
}

/** Find entry points for structural file selection */
export function findEntryPoints(files: ParsedFile[]): ParsedFile[] {
    // Common entry point patterns
    const entryPatterns = [
        "index.ts",
        "index.tsx",
        "index.js",
        "index.jsx",
        "main.ts",
        "main.tsx",
        "main.js",
        "main.jsx",
        "app.ts",
        "app.tsx",
        "app.js",
        "app.jsx",
        "server.ts",
        "server.js",
        "cli.ts",
        "cli.js",
    ];

    return files.filter(f =>
        f.parsed &&
        entryPatterns.some(p => f.relativePath.endsWith(p) || f.relativePath.endsWith("/" + p) || f.relativePath.endsWith("\\" + p))
    );
}