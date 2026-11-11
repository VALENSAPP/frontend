/**
 * Metro symbolication calls readFileSync on path.resolve(projectRoot, file).
 * Some stacks use file === "unknown", which becomes .../unknown and throws ENOENT.
 * Re-applies the guard after every npm install (nested metro has no root hoisting).
 */
const fs = require('fs');
const path = require('path');

const PATCH_SENTINEL = 'file === "unknown"';

function patchMetroServer(candidate) {
  if (!fs.existsSync(candidate)) {
    return false;
  }
  let s = fs.readFileSync(candidate, 'utf8');
  if (s.includes(PATCH_SENTINEL)) {
    return false;
  }
  const oldBlock = `        const fileAbsolute = path.resolve(this._config.projectRoot, file ?? "");
        try {
          return {
            content: codeFrameColumns(
              fs.readFileSync(fileAbsolute, "utf8"),`;
  if (!s.includes(oldBlock)) {
    return false;
  }
  const newBlock = `        // METRO_PATCH: skip unknown / missing paths (symbolication ENOENT)
        if (!file || file === "unknown") {
          continue;
        }
        const fileAbsolute = path.resolve(this._config.projectRoot, file);
        if (!fs.existsSync(fileAbsolute)) {
          continue;
        }
        try {
          return {
            content: codeFrameColumns(
              fs.readFileSync(fileAbsolute, "utf8"),`;
  fs.writeFileSync(candidate, s.replace(oldBlock, newBlock));
  return true;
}

const DEP_GRAPH_SENTINEL = 'METRO_PATCH: guard getOrCreateMap';

function patchMetroDependencyGraph(candidate) {
  if (!fs.existsSync(candidate)) {
    return false;
  }
  let s = fs.readFileSync(candidate, 'utf8');
  if (s.includes(DEP_GRAPH_SENTINEL)) {
    return false;
  }
  const oldFn = 'function getOrCreateMap(map, field) {\n  let subMap = map.get(field);';
  const oldFnCRLF = 'function getOrCreateMap(map, field) {\r\n  let subMap = map.get(field);';
  const target = s.includes(oldFnCRLF) ? oldFnCRLF : s.includes(oldFn) ? oldFn : null;
  if (!target) {
    return false;
  }
  const isCRLF = target === oldFnCRLF;
  const newline = isCRLF ? '\r\n' : '\n';
  const replacement = `// METRO_PATCH: guard getOrCreateMap${newline}function getOrCreateMap(map, field) {${newline}  if (!map) return new Map();${newline}  let subMap = map.get(field);`;
  s = s.replace(target, replacement);
  if (s.includes('this._config = config;') && !s.includes('this._resolutionCache = new Map();')) {
    s = s.replace('this._config = config;', `this._config = config;${newline}    this._resolutionCache = new Map();`);
  }
  fs.writeFileSync(candidate, s, 'utf8');
  return true;
}

const root = path.join(__dirname, '..');
const candidates = [
  path.join(root, 'node_modules/@react-native/community-cli-plugin/node_modules/metro/src/Server.js'),
  path.join(root, 'node_modules/metro-config/node_modules/metro/src/Server.js'),
  path.join(root, 'node_modules/metro/src/Server.js'),
];

const depGraphCandidates = [
  path.join(root, 'node_modules/@react-native/community-cli-plugin/node_modules/metro/src/node-haste/DependencyGraph.js'),
  path.join(root, 'node_modules/metro-config/node_modules/metro/src/node-haste/DependencyGraph.js'),
  path.join(root, 'node_modules/metro/src/node-haste/DependencyGraph.js'),
];

let n = 0;
for (const c of candidates) {
  if (patchMetroServer(c)) {
    n += 1;
  }
}
if (n > 0) {
  console.log(`patch-metro-symbolicate: patched ${n} metro Server.js`);
}

let m = 0;
for (const c of depGraphCandidates) {
  if (patchMetroDependencyGraph(c)) {
    m += 1;
  }
}
if (m > 0) {
  console.log(`patch-metro-symbolicate: patched ${m} metro DependencyGraph.js`);
}
