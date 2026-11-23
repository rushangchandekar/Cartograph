import * as path from "path";

function normalizePath(p: string): string {
    return p.replace(/\\/g, "/");
}

const rootDir = "C:/Users/Rushang/AppData/Local/Temp/test-repo";
const fromFile = "src/index.ts";
const specifier = "./utils/math";

const fromDir = path.dirname(fromFile);
let targetPath: string;
targetPath = path.resolve(fromDir, specifier);
console.log("targetPath:", targetPath);

const normalizedTarget = normalizePath(path.relative(rootDir, targetPath));
console.log("normalizedTarget:", normalizedTarget);

// Now try with absolute path for targetPath
const absoluteTarget = path.join(rootDir, "src", "utils", "math.ts");
console.log("absoluteTarget:", absoluteTarget);
const relFromRoot = normalizePath(path.relative(rootDir, absoluteTarget));
console.log("relFromRoot:", relFromRoot);

// Test with resolveSpecifier logic
const fromDir2 = path.dirname(fromFile);
let targetPath2: string;
targetPath2 = path.resolve(fromDir2, specifier);
console.log("targetPath2:", targetPath2);

const normalizedTarget2 = normalizePath(path.relative(rootDir, targetPath2));
console.log("normalizedTarget2:", normalizedTarget2);