import { Project } from "ts-morph";
import * as path from "path";
import { addSourceFiles } from "./src/import-resolver.js";

const project = new Project({
  compilerOptions: { target: 99, module: 99, moduleResolution: 2, allowJs: true, jsx: 4 }
});

const sf1 = project.addSourceFileAtPath('C:/Users/Rushang/AppData/Local/Temp/test-repo/src/index.ts');
const sf2 = project.addSourceFileAtPath('C:/Users/Rushang/AppData/Local/Temp/test-repo/src/utils/math.ts');
const sf3 = project.addSourceFileAtPath('C:/Users/Rushang/AppData/Local/Temp/test-repo/src/utils/format.ts');

const files = [
  { path: 'C:/Users/Rushang/AppData/Local/Temp/test-repo/src/index.ts', relativePath: 'src/index.ts', parsed: true },
  { path: 'C:/Users/Rushang/AppData/Local/Temp/test-repo/src/utils/math.ts', relativePath: 'src/utils/math.ts', parsed: true },
  { path: 'C:/Users/Rushang/AppData/Local/Temp/test-repo/src/utils/format.ts', relativePath: 'src/utils/format.ts', parsed: true },
];

const sourceFileMap = addSourceFiles(project, files);

console.log('Map keys:', Array.from(sourceFileMap.keys()));

// Now test extractImports
import { extractImports } from "./src/import-resolver.js";

const imports = extractImports(sf1, 'src/index.ts', sourceFileMap, 'C:/Users/Rushang/AppData/Local/Temp/test-repo');
console.log('Imports from index.ts:', imports.length);
for (const imp of imports) {
  console.log('  Specifier:', imp.specifier, 'Kind:', imp.kind, 'Resolved:', imp.resolved, 'Target:', imp.targetPath);
}