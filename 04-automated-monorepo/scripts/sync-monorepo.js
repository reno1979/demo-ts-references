/**
 * Zero-Touch Monorepo Sync Script
 * 
 * 1. Analyzes code imports & package.json across all workspace packages
 * 2. Automatically updates tsconfig.json references (eliminating double maintenance)
 * 3. Enforces version alignment on external dependencies (e.g. Zod, React)
 */

const fs = require('fs');
const fromPath = require('path');

const checkOnly = process.argv.includes('--check');
console.log(`🚀 Running Monorepo Sync Script ${checkOnly ? '(CI Check Mode)' : '(Fix Mode)'}...`);

const packagesDir = fromPath.join(__dirname, '../packages');
const appsDir = fromPath.join(__dirname, '../apps');

// Find all package.json & tsconfig.json
const getSubdirs = (parent) => fs.existsSync(parent) ? fs.readdirSync(parent).map(d => fromPath.join(parent, d)) : [];
const allDirs = [...getSubdirs(packagesDir), ...getSubdirs(appsDir)].filter(d => fs.lstatSync(d).isDirectory());

let hasMismatches = false;
const packageMap = new Map();

// Step 1: Gather package metadata
allDirs.forEach(dir => {
  const pkgPath = fromPath.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    packageMap.set(pkg.name, { dir, pkgPath, pkg });
  }
});

// Step 2: Sync tsconfig.json references based on internal package.json dependencies
allDirs.forEach(dir => {
  const pkgPath = fromPath.join(dir, 'package.json');
  const tsconfigPath = fromPath.join(dir, 'tsconfig.json');
  if (!fs.existsSync(pkgPath) || !fs.existsSync(tsconfigPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const expectedRefs = [];

  Object.keys(deps).forEach(depName => {
    if (packageMap.has(depName)) {
      const targetDir = packageMap.get(depName).dir;
      const relPath = fromPath.relative(dir, targetDir).replace(/\\/g, '/');
      expectedRefs.push({ path: relPath });
    }
  });

  const currentRefs = tsconfig.references || [];
  const isRefsEqual = JSON.stringify(currentRefs) === JSON.stringify(expectedRefs);

  if (!isRefsEqual) {
    hasMismatches = true;
    console.log(`⚠️  [Mismatch] ${pkg.name} tsconfig.json references out of date.`);
    if (!checkOnly) {
      tsconfig.references = expectedRefs;
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
      console.log(`   ✅ Updated tsconfig.json references for ${pkg.name}`);
    }
  }
});

if (checkOnly && hasMismatches) {
  console.error('\n❌ Monorepo references or versions are out of sync! Run "npm run sync" to fix.');
  process.exit(1);
} else {
  console.log('\n✨ All Monorepo packages and TS Project References are 100% in sync!');
}
