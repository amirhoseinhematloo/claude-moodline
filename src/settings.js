'use strict';

// Reads and writes the `statusLine` entry in Claude Code's user settings.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PACKAGE_NAME = 'claude-moodline';

/** Claude Code honours CLAUDE_CONFIG_DIR; otherwise it is ~/.claude on every OS. */
function claudeDir(env = process.env) {
  return env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function settingsPath(env = process.env) {
  return path.join(claudeDir(env), 'settings.json');
}

/**
 * The command Claude Code should run. An absolute `node "<script>"` works on
 * every OS and shell regardless of PATH or npm's .cmd shims. Forward slashes
 * keep a Windows path intact when Claude Code runs it through Git Bash.
 * When we are running from a throwaway npx cache, that path will vanish, so
 * fall back to npx itself.
 */
function buildCommand(scriptPath, extraArgs = []) {
  const args = extraArgs.length ? ' ' + extraArgs.join(' ') : '';
  const normalized = scriptPath.replace(/\\/g, '/');
  if (/[\\/]_npx[\\/]/.test(scriptPath)) return `npx -y ${PACKAGE_NAME}${args}`;
  return `node "${normalized}"${args}`;
}

function readSettings(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Could not parse ${file}: ${err.message}. Fix it by hand, then retry.`);
  }
}

function writeSettings(file, settings) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
  // Write to a temp file then rename, so a crash never leaves half a settings file.
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

const isOurs = (statusLine) =>
  !!statusLine && typeof statusLine.command === 'string' && statusLine.command.includes(PACKAGE_NAME);

/**
 * @returns {{ file: string, command: string, previous: object | undefined }}
 */
function install({ scriptPath, args = [], force = false, refreshInterval = 60, env = process.env }) {
  const file = settingsPath(env);
  const settings = readSettings(file);
  const previous = settings.statusLine;
  if (previous && !isOurs(previous) && !force) {
    const err = new Error(
      `A different status line is already configured:\n  ${JSON.stringify(previous)}\n` +
        'Re-run with --force to replace it (a backup is written to settings.json.bak).',
    );
    err.code = 'EXISTS';
    throw err;
  }
  const command = buildCommand(scriptPath, args);
  settings.statusLine = { type: 'command', command, refreshInterval };
  writeSettings(file, settings);
  return { file, command, previous };
}

/** @returns {{ file: string, removed: boolean }} */
function uninstall({ force = false, env = process.env } = {}) {
  const file = settingsPath(env);
  const settings = readSettings(file);
  if (!settings.statusLine) return { file, removed: false };
  if (!isOurs(settings.statusLine) && !force) {
    const err = new Error('The configured status line is not claude-moodline; leaving it alone (use --force to remove it anyway).');
    err.code = 'NOT_OURS';
    throw err;
  }
  delete settings.statusLine;
  writeSettings(file, settings);
  return { file, removed: true };
}

module.exports = { PACKAGE_NAME, claudeDir, settingsPath, buildCommand, install, uninstall };
