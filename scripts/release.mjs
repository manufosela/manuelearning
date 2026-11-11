#!/usr/bin/env node
// Release step (MEL-TSK-0104): bump package.json and write CHANGELOG.md from the
// Conventional Commits since the last version change. Run it on a chore/release-*
// branch and open a PR. --dry-run prints the entry and writes nothing.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { insertEntry, nextVersion, parseCommit, renderEntry } from './lib/release.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
const path = (name) => `${root}${name}`;

const base = git('log', '-1', '--format=%H', '-G', '"version":', '--', 'package.json');
if (!base) throw new Error('No encuentro el último cambio de versión en package.json');
const commits = git('log', `${base}..HEAD`, '--no-merges', '--format=%s')
  .split('\n')
  .map(parseCommit)
  .filter(Boolean);

const pkg = JSON.parse(readFileSync(path('package.json'), 'utf8'));
const version = nextVersion(pkg.version, commits);
if (!version) {
  console.log(`Nada que publicar desde ${pkg.version}: no hay commits feat, fix ni rupturas.`);
  process.exit(0);
}

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date());
const entry = renderEntry(version, today, commits);
console.log(`${pkg.version} → ${version}\n\n${entry}`);
if (dryRun) process.exit(0);

const writeJson = (name, update) => {
  const data = JSON.parse(readFileSync(path(name), 'utf8'));
  update(data);
  writeFileSync(path(name), `${JSON.stringify(data, null, 2)}\n`);
};
writeJson('package.json', (data) => { data.version = version; });
writeJson('package-lock.json', (data) => {
  data.version = version;
  data.packages[''].version = version;
});
writeFileSync(path('CHANGELOG.md'), insertEntry(readFileSync(path('CHANGELOG.md'), 'utf8'), entry));
console.log('package.json, package-lock.json y CHANGELOG.md actualizados. Commit: chore(release): v' + version);
