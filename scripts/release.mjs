import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dryRun = process.argv.includes('--dry-run');

if (process.argv.slice(2).some(arg => arg !== '--dry-run')) {
  throw new Error('Usage: node scripts/release.mjs [--dry-run]');
}

const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
const currentPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const bump = run('conventional-recommended-bump', ['--preset', 'angular', '--tag-prefix', 'v']);

if (!bump) {
  console.log('No release is recommended by the commits since the latest v* tag.');
  process.exit(0);
}

if (!['major', 'minor', 'patch'].includes(bump)) {
  throw new Error(`Unexpected release type: ${bump}`);
}

const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(currentPackage.version);
if (!match) throw new Error(`Expected a stable x.y.z version, got: ${currentPackage.version}`);

const [major, minor, patch] = match.slice(1).map(Number);
const nextVersion = bump === 'major'
  ? `${major + 1}.0.0`
  : bump === 'minor'
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;
const tag = `v${nextVersion}`;
const tempDir = mkdtempSync(join(tmpdir(), 'animesice-release-'));

try {
  const tempPackagePath = join(tempDir, 'package.json');
  writeFileSync(tempPackagePath, JSON.stringify({ ...currentPackage, version: nextVersion }));
  const notes = run('conventional-changelog', [
    '--preset', 'angular',
    '--tag-prefix', 'v',
    '--release-count', '1',
    '--stdout',
    '--infile', devNull,
    '--pkg', tempPackagePath,
  ]);

  if (!notes) throw new Error(`No changelog notes generated for ${tag}`);
  if (dryRun) {
    console.log(`Would create ${tag} (${bump})\n\n${notes}`);
  } else {
    const branch = run('git', ['branch', '--show-current']);
    if (branch && branch !== 'main') throw new Error(`Releases are only allowed from main, got: ${branch}`);
    if (run('git', ['status', '--porcelain', '--', 'package.json', 'package-lock.json', 'CHANGELOG.md'])) {
      throw new Error('Commit package.json, package-lock.json, and CHANGELOG.md changes before releasing.');
    }

    run('gh', ['auth', 'setup-git']);
    run('npm', ['version', bump, '--no-git-tag-version', '--ignore-scripts']);
    writeFileSync(join(root, 'CHANGELOG.md'), `${notes}\n\n${readFileSync(join(root, 'CHANGELOG.md'), 'utf8')}`);
    run('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
    run('git', ['commit', '-m', `chore(release): ${nextVersion} [skip ci]`, '-m', notes]);
    run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);
    run('git', ['push', '--atomic', 'origin', 'HEAD:refs/heads/main', `refs/tags/${tag}`]);
    run('gh', ['release', 'create', tag, '--title', tag, '--notes', notes, '--verify-tag']);
    console.log(`Created GitHub Release ${tag}.`);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
