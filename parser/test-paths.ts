import { Project } from "ts-morph";

const project = new Project({
  compilerOptions: { target: 99, module: 99, moduleResolution: 2, allowJs: true, jsx: 4 }
});

const sf1 = project.addSourceFileAtPath('C:/Users/Rushang/AppData/Local/Temp/test-repo/src/index.ts');
const sf2 = project.addSourceFileAtPath('C:/Users/Rushang/AppData/Local/Temp/test-repo/src/utils/math.ts');
const sf3 = project.addSourceFileAtPath('C:/Users/Rushang/AppData/Local/Temp/test-repo/src/utils/format.ts');

const sourceFileMap = new Map();
sourceFileMap.set('src/index.ts', sf1);
sourceFileMap.set('src/utils/math.ts', sf2);
sourceFileMap.set('src/utils/format.ts', sf3);

console.log('Map keys:', Array.from(sourceFileMap.keys()));
console.log('Has src/utils/math.ts:', sourceFileMap.has('src/utils/math.ts'));
console.log('Has src\\\\utils\\\\math.ts:', sourceFileMap.has('src\\\\utils\\\\math.ts'));