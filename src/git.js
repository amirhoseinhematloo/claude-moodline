'use strict';

// Finds the current git branch by reading .git/HEAD directly. The status
// line refreshes often, so this avoids spawning `git` on every render.

const fs = require('node:fs');
const path = require('node:path');

/** Returns the git dir for `dir` or a parent of it, or null if not in a repo. */
function findGitDir(dir) {
  for (let cur = path.resolve(dir); ; ) {
    const dotGit = path.join(cur, '.git');
    try {
      const stat = fs.statSync(dotGit);
      if (stat.isDirectory()) return dotGit;
      // Worktrees and submodules have a .git file: "gitdir: <path>".
      const m = /^gitdir:\s*(.+?)\s*$/m.exec(fs.readFileSync(dotGit, 'utf8'));
      if (m) return path.resolve(cur, m[1]);
    } catch {
      // No .git here; keep walking up.
    }
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

/**
 * @param {string} dir  Directory to look up from.
 * @returns {string|null} Branch name, short commit hash when detached, or null.
 */
function gitBranch(dir) {
  try {
    const gitDir = findGitDir(dir);
    if (!gitDir) return null;
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
    if (ref) return ref[1];
    return /^[0-9a-f]{7,}$/i.test(head) ? head.slice(0, 7) : null;
  } catch {
    return null;
  }
}

module.exports = { gitBranch };
