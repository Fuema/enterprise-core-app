// Replaces every "latest" range in package.json with a caret range of the
// version actually installed in node_modules. Run once after the first
// `npm install` so the template becomes reproducible:  npm run deps:pin
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

let changed = 0;
for (const section of ['dependencies', 'devDependencies']) {
  const deps = pkg[section] ?? {};
  for (const [name, range] of Object.entries(deps)) {
    if (range !== 'latest') continue;
    const installed = join(root, 'node_modules', name, 'package.json');
    if (!existsSync(installed)) {
      console.warn(`skip ${name}: not installed (run npm install first)`);
      continue;
    }
    const { version } = JSON.parse(readFileSync(installed, 'utf8'));
    deps[name] = `^${version}`;
    changed += 1;
    console.log(`${name}: latest -> ^${version}`);
  }
}

writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Pinned ${changed} package(s).`);
