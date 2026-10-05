'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gitBranch } = require('../src/git.js');

function fakeRepo(head) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-git-'));
  fs.mkdirSync(path.join(dir, '.git'));
  fs.writeFileSync(path.join(dir, '.git', 'HEAD'), head);
  return dir;
}

test('reads the branch from .git/HEAD', () => {
  assert.equal(gitBranch(fakeRepo('ref: refs/heads/main\n')), 'main');
  assert.equal(gitBranch(fakeRepo('ref: refs/heads/feat/branch-name\n')), 'feat/branch-name');
});

test('finds the repo from a subdirectory', () => {
  const dir = fakeRepo('ref: refs/heads/dev\n');
  const sub = path.join(dir, 'a', 'b');
  fs.mkdirSync(sub, { recursive: true });
  assert.equal(gitBranch(sub), 'dev');
});

test('detached HEAD shows the short commit hash', () => {
  assert.equal(gitBranch(fakeRepo('0123456789abcdef0123456789abcdef01234567\n')), '0123456');
});

test('follows a .git file to a worktree git dir', () => {
  const main = fakeRepo('ref: refs/heads/main\n');
  const wtGitDir = path.join(main, '.git', 'worktrees', 'wt');
  fs.mkdirSync(wtGitDir, { recursive: true });
  fs.writeFileSync(path.join(wtGitDir, 'HEAD'), 'ref: refs/heads/feature\n');
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-wt-'));
  fs.writeFileSync(path.join(wt, '.git'), `gitdir: ${wtGitDir}\n`);
  assert.equal(gitBranch(wt), 'feature');
});

test('returns null outside a repo or on a missing dir', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moodline-nogit-'));
  if (gitBranch(path.dirname(dir)) === null) assert.equal(gitBranch(dir), null);
  assert.equal(gitBranch(path.join(dir, 'does', 'not', 'exist')), null);
});
