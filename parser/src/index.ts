/**
 * Main parser entry point.
 * Takes a directory path, returns structured data.
 * No web framework, no UI, no database - pure parsing logic.
 */

import * as fs from "fs";
import * as path from "path";
import { Project } from "ts-morph";
import {
    ParsedFile,
    ImportEdge,
    ParseResult,
    ParserConfig,
    DEFAULT_CONFIG,
} from "./types.js";
import { createConfig, walkRepository, findEntryPoints } from "./file-walker.js";
import { extractImports, addSourceFiles } from "./import-resolver.js";
import { computeCoverage, computeFanIn, computeFanOut, deduplicateEdges } from "./coverage.js";
import { analyzeFrameworks } from "./framework-adapter.js";

export function parseRepository(rootDir: string, overrides?: Partial<ParserConfig>): ParseResult {
    const config = createConfig(rootDir, overrides);
    const startTime = Date.now();

    console.log(`[parser] Walking repository: ${rootDir}`);

    // Step 1: Discover all files
    const files = walkRepository(config);
    const parsedFiles = files.filter((f: ParsedFile) => f.parsed);
    const skippedFiles = files.filter((f: ParsedFile) => !f.parsed);

    console.log(`[parser] Files found: ${files.length}`);
    console.log(`[parser] Files parsed: ${parsedFiles.length}`);
    console.log(`[parser] Files skipped: ${skippedFiles.length}`);

    if (skippedFiles.length > 0) {
        console.log("[parser] Skip reasons:");
        for (const f of skippedFiles) {
            console.log(`  - ${f.relativePath}: ${f.skipReason}`);
        }
    }

    // Step 2: Create ts-morph project and add source files
    const project = new Project({
        useInMemoryFileSystem: false,
        compilerOptions: {
            target: 99,
            module: 99,
            moduleResolution: 2,
            allowJs: true,
            jsx: 4,
            resolveJsonModule: true,
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            skipLibCheck: true,
            noEmit: true,
        },
    });
    const sourceFileMap = addSourceFiles(project, parsedFiles);

    // Step 3: Extract imports from each file
    const allImports: ImportEdge[] = [];

    for (const file of parsedFiles) {
        const normalizedRel = file.relativePath.replace(/\\/g, "/");
        const sourceFile = sourceFileMap.get(normalizedRel);
        if (!sourceFile) continue;

        const imports = extractImports(sourceFile, normalizedRel, sourceFileMap, config.rootDir);

        for (const imp of imports) {
            allImports.push({
                from: normalizedRel,
                to: imp.targetPath ?? "",
                specifier: imp.specifier,
                kind: imp.kind,
                resolved: imp.resolved,
                unresolvedReason: imp.unresolvedReason,
                line: imp.line,
            });
        }
    }

    // Step 4: Deduplicate edges
    const uniqueEdges = deduplicateEdges(allImports);

    // Step 5: Compute coverage
    const coverage = computeCoverage(uniqueEdges);

    // Step 6: Compute fan-in/fan-out
    const fanIn = computeFanIn(uniqueEdges);
    const fanOut = computeFanOut(uniqueEdges);

    // Step 7: Framework analysis (fallback only in this phase)
    const frameworkAnalysis = analyzeFrameworks(parsedFiles, (p: string) => fs.readFileSync(p, "utf-8"));

    // Step 8: Build result
    const result: ParseResult = {
        rootPath: config.rootDir,
        files: parsedFiles,
        edges: uniqueEdges,
        coverage,
        fanIn,
        fanOut,
        timestamp: new Date().toISOString(),
        parserVersion: "1.0.0",
    };

    const duration = Date.now() - startTime;
    console.log(`[parser] Completed in ${duration}ms`);
    console.log(`[parser] Coverage: ${coverage.resolved}/${coverage.totalImports} resolved (${((coverage.resolved / coverage.totalImports) * 100).toFixed(1)}%)`);

    return result;
}

export function writeParseResult(result: ParseResult, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`[parser] Written to ${outputPath}`);
}

export function readParseResult(inputPath: string): ParseResult {
    const content = fs.readFileSync(inputPath, "utf-8");
    return JSON.parse(content);
}

/** CLI entry point - works with both tsx and compiled node */
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith("index.js") ||
    process.argv[1]?.endsWith("index.ts");

if (isMainModule) {
    const args = process.argv.slice(2);
    const rootDir = args[0] || process.cwd();
    const outputPath = args[1];

    try {
        const result = parseRepository(rootDir);
        if (outputPath) {
            writeParseResult(result, outputPath);
        }
        process.exit(0);
    } catch (error) {
        console.error("[parser] Error:", error);
        process.exit(1);
    }
}