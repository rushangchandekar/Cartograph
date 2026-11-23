/**
 * Import resolution using ts-morph.
 * Resolves static imports, dynamic imports, re-exports, and require() calls.
 */

import { Project, SourceFile, SyntaxKind, ImportDeclaration, ExportDeclaration, CallExpression, StringLiteral } from "ts-morph";
import * as path from "path";
import { ParsedFile, ImportEdge, ImportKind, UnresolvedReason } from "./types.js";

interface ResolvedImport {
    specifier: string;
    kind: ImportKind;
    resolved: boolean;
    targetPath?: string;
    unresolvedReason?: UnresolvedReason;
    line: number;
}

export function addSourceFiles(project: Project, files: ParsedFile[]): Map<string, SourceFile> {
    const sourceFileMap = new Map<string, SourceFile>();

    for (const file of files) {
        if (!file.parsed) continue;
        try {
            const sourceFile = project.addSourceFileAtPath(file.path);
            // Normalize to forward slashes for consistent matching
            const normalizedRel = file.relativePath.replace(/\\/g, "/");
            sourceFileMap.set(normalizedRel, sourceFile);
        } catch (error) {
            console.warn(`Failed to add source file ${file.relativePath}:`, error);
        }
    }

    return sourceFileMap;
}

/**
 * Normalize path to forward slashes for consistent matching.
 */
function normalizePath(p: string): string {
    return p.replace(/\\/g, "/");
}

/**
 * Resolve an import specifier to a file in the repository.
 */
function resolveSpecifier(
    specifier: string,
    fromFile: string,
    sourceFileMap: Map<string, SourceFile>,
    rootDir: string
): { resolved: boolean; targetPath?: string; reason?: UnresolvedReason } {
    // External package
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
        return { resolved: false, reason: "external" };
    }

    const fromDir = path.dirname(fromFile);
    let targetPath: string;

    if (specifier.startsWith("/")) {
        // Absolute from root
        targetPath = path.join(rootDir, specifier);
    } else {
        // Relative - resolve from the repo root + file's directory
        targetPath = path.resolve(rootDir, fromDir, specifier);
    }

    // Normalize for matching
    const normalizedTarget = normalizePath(path.relative(rootDir, targetPath));

    // Try exact match
    if (sourceFileMap.has(normalizedTarget)) {
        return { resolved: true, targetPath: normalizedTarget };
    }

    // Try with extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
    for (const ext of extensions) {
        const withExt = normalizedTarget + ext;
        if (sourceFileMap.has(withExt)) {
            return { resolved: true, targetPath: withExt };
        }
    }

    // Try index files
    for (const ext of extensions) {
        const indexPath = path.join(normalizedTarget, `index${ext}`);
        const normalizedIndex = normalizePath(indexPath);
        if (sourceFileMap.has(normalizedIndex)) {
            return { resolved: true, targetPath: normalizedIndex };
        }
    }

    // Check if it's a barrel file (directory with index)
    for (const ext of extensions) {
        const indexPath = path.join(targetPath, `index${ext}`);
        const relIndexPath = normalizePath(path.relative(rootDir, indexPath));
        if (sourceFileMap.has(relIndexPath)) {
            return { resolved: true, targetPath: relIndexPath };
        }
    }

    // File doesn't exist
    return { resolved: false, reason: "missing" };
}

/**
 * Extract all imports from a source file.
 */
export function extractImports(
    sourceFile: SourceFile,
    fromFile: string,
    sourceFileMap: Map<string, SourceFile>,
    rootDir: string
): ResolvedImport[] {
    const imports: ResolvedImport[] = [];
    const normalizedFromFile = normalizePath(fromFile);

    // Static imports: import ... from "specifier"
    for (const importDecl of sourceFile.getImportDeclarations()) {
        const specifier = importDecl.getModuleSpecifierValue();
        const line = importDecl.getStartLineNumber();

        const { resolved, targetPath, reason } = resolveSpecifier(specifier, normalizedFromFile, sourceFileMap, rootDir);

        // Check if it's a type-only import (type-only counts as re-export for our purposes)
        const isTypeOnly = importDecl.isTypeOnly();

        const kind: ImportKind = isTypeOnly ? "reexport" : "static";

        imports.push({
            specifier,
            kind,
            resolved,
            targetPath,
            unresolvedReason: reason,
            line,
        });
    }

    // Re-exports: export ... from "specifier"
    for (const exportDecl of sourceFile.getExportDeclarations()) {
        const moduleSpecifier = exportDecl.getModuleSpecifier();
        if (!moduleSpecifier) continue; // export { foo } from "./bar" vs export { foo }

        const specifier = moduleSpecifier.getText().slice(1, -1); // Remove quotes
        const line = exportDecl.getStartLineNumber();

        const { resolved, targetPath, reason } = resolveSpecifier(specifier, normalizedFromFile, sourceFileMap, rootDir);

        imports.push({
            specifier,
            kind: "reexport",
            resolved,
            targetPath,
            unresolvedReason: reason,
            line,
        });
    }

    // Dynamic imports: import("specifier") or await import("specifier")
    for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const expression = callExpr.getExpression();
        if (expression.getKind() === SyntaxKind.ImportKeyword) {
            const args = callExpr.getArguments();
            if (args.length === 1 && args[0] instanceof StringLiteral) {
                const specifier = args[0].getLiteralValue();
                const line = callExpr.getStartLineNumber();

                const { resolved, targetPath, reason } = resolveSpecifier(specifier, normalizedFromFile, sourceFileMap, rootDir);

                imports.push({
                    specifier,
                    kind: "dynamic",
                    resolved,
                    targetPath,
                    unresolvedReason: reason,
                    line,
                });
            }
        }
    }

    // Require() calls: require("specifier")
    for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const expression = callExpr.getExpression();
        if (expression.getText() === "require") {
            const args = callExpr.getArguments();
            if (args.length === 1 && args[0] instanceof StringLiteral) {
                const specifier = args[0].getLiteralValue();
                const line = callExpr.getStartLineNumber();

                const { resolved, targetPath, reason } = resolveSpecifier(specifier, normalizedFromFile, sourceFileMap, rootDir);

                imports.push({
                    specifier,
                    kind: "require",
                    resolved,
                    targetPath,
                    unresolvedReason: reason,
                    line,
                });
            }
        }
    }

    return imports;
}