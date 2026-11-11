import { describe, it, expect } from 'vitest';
import {
  CHANGELOG_MARKER,
  parseCommit,
  nextVersion,
  renderEntry,
  insertEntry,
} from '../scripts/lib/release.mjs';

const commits = (...subjects) => subjects.map(parseCommit).filter(Boolean);

describe('parseCommit', () => {
  it('reads type, scope and breaking mark', () => {
    expect(parseCommit('feat(admin): invitar usuarios (MEL-TSK-0106)')).toEqual({
      type: 'feat', breaking: false, subject: 'feat(admin): invitar usuarios (MEL-TSK-0106)',
    });
    expect(parseCommit('feat!: nuevo modelo de cursos').breaking).toBe(true);
  });

  it('ignores merge commits and free text', () => {
    expect(parseCommit('Merge pull request #105 from manufosela/x')).toBeNull();
    expect(parseCommit('arreglos varios')).toBeNull();
  });
});

describe('nextVersion', () => {
  it.each([
    [['fix: a'], '1.0.56'],
    [['fix: a', 'feat: b'], '1.1.0'],
    [['feat!: b', 'fix: a'], '2.0.0'],
  ])('bumps %j to %s', (subjects, expected) => {
    expect(nextVersion('1.0.55', commits(...subjects))).toBe(expected);
  });

  it('has nothing to release without feat or fix', () => {
    expect(nextVersion('1.0.55', commits('chore: a', 'docs: b', 'test: c'))).toBeNull();
  });

  it('fails loudly on a version that is not SemVer', () => {
    expect(() => nextVersion('1.0', commits('fix: a'))).toThrow();
  });
});

describe('renderEntry', () => {
  it('groups features and fixes under the version and date', () => {
    const entry = renderEntry('1.1.0', '2026-11-11', commits('fix: heatmap', 'chore: x', 'feat: tours', 'feat: invitaciones'));
    expect(entry).toBe([
      '## [1.1.0] - 2026-11-11',
      '### Features',
      '- feat: tours',
      '- feat: invitaciones',
      '### Fixes',
      '- fix: heatmap',
      '',
    ].join('\n'));
  });
});

describe('insertEntry', () => {
  it('puts the new entry right after the marker, above older versions', () => {
    const changelog = `# Changelog\n\n${CHANGELOG_MARKER}\n## [1.0.55] - 2026-03-15\n- fix: x\n`;
    const result = insertEntry(changelog, '## [1.1.0] - 2026-11-11\n- feat: y\n');
    expect(result).toBe(`# Changelog\n\n${CHANGELOG_MARKER}\n## [1.1.0] - 2026-11-11\n- feat: y\n\n## [1.0.55] - 2026-03-15\n- fix: x\n`);
  });

  it('fails loudly when the marker is missing', () => {
    expect(() => insertEntry('# Changelog\n', 'x')).toThrow();
  });
});
