// Pure release logic: SemVer bump and CHANGELOG entry from Conventional Commits.

export const CHANGELOG_MARKER = '<!-- CHANGELOG_ENTRIES -->';

const COMMIT = /^(?<type>[a-z]+)(?:\([^)]*\))?(?<bang>!)?: .+/;

/**
 * @param {string} subject first line of a commit
 * @returns {{ type: string, breaking: boolean, subject: string } | null}
 */
export function parseCommit(subject) {
  const match = COMMIT.exec(subject);
  if (!match) return null;
  return { type: match.groups.type, breaking: Boolean(match.groups.bang), subject };
}

/**
 * @param {string} current SemVer x.y.z
 * @param {Array<{ type: string, breaking: boolean }>} commits
 * @returns {string | null} null when there is no feat, fix or breaking change
 */
export function nextVersion(current, commits) {
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!parts) throw new Error(`Versión no SemVer: ${current}`);
  const [major, minor, patch] = parts.slice(1).map(Number);
  if (commits.some((c) => c.breaking)) return `${major + 1}.0.0`;
  if (commits.some((c) => c.type === 'feat')) return `${major}.${minor + 1}.0`;
  if (commits.some((c) => c.type === 'fix')) return `${major}.${minor}.${patch + 1}`;
  return null;
}

/**
 * @param {string} version
 * @param {string} date YYYY-MM-DD
 * @param {Array<{ type: string, subject: string }>} commits
 * @returns {string}
 */
export function renderEntry(version, date, commits) {
  const section = (title, type) => {
    const lines = commits.filter((c) => c.type === type).map((c) => `- ${c.subject}`);
    return lines.length > 0 ? [title, ...lines] : [];
  };
  return [`## [${version}] - ${date}`, ...section('### Features', 'feat'), ...section('### Fixes', 'fix'), ''].join('\n');
}

/**
 * @param {string} changelog
 * @param {string} entry
 * @returns {string}
 */
export function insertEntry(changelog, entry) {
  const at = changelog.indexOf(CHANGELOG_MARKER);
  if (at < 0) throw new Error(`CHANGELOG.md no tiene el marcador ${CHANGELOG_MARKER}`);
  const end = at + CHANGELOG_MARKER.length + 1;
  return `${changelog.slice(0, end)}${entry}\n${changelog.slice(end)}`;
}
