# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ralph-worktree (`rw`) is a CLI that orchestrates parallel autonomous development tasks using git worktrees and Claude Code. Each task runs in an isolated worktree with its own Claude agent loop, all tasks execute in parallel via `Promise.all`.

## Commands

```bash
npm run build        # Build with tsup → dist/cli.js
npm run dev          # Build in watch mode
npm test             # Run all tests (vitest)
npm run test:watch   # Run tests in watch mode
npm run lint         # Type-check with tsc --noEmit
npx vitest run tests/todo-parser.test.ts  # Run a single test file
npm link             # Install `rw` command globally (after build)
```

## Architecture

**Execution flow:** `rw run` → parse `.rw/TODO.md` → build agent prompts from `PROMPT.md + RULES.md + specs/` → scheduler dispatches all tasks in parallel → each task gets an isolated worktree → agent loop calls `claude --print` iteratively → circuit breaker prevents infinite loops → results written to `.rw/state.json`.

**Key layers:**

- **Commands** (`src/commands/`) — CLI handlers registered via Commander.js. Each file is one subcommand (`init`, `run`, `list`, `add`, `remove`, `clean`, `merge`).
- **Core** (`src/core/`) — Business logic:
  - `scheduler.ts` — Parallel task orchestration (all tasks run concurrently via Promise.all)
  - `agent-loop.ts` — Iterative Claude CLI invocation loop (max 20 iterations), commits on diff, parses status blocks
  - `worktree.ts` — Git worktree provisioning/cleanup per task
  - `todo-parser.ts` — Parses/writes `.rw/TODO.md` with status markers: `[ ]` pending, `[~]` running, `[x]` done, `[!]` failed
  - `circuit-breaker.ts` — Stops agents after 3 no-progress loops or 5 identical errors
  - `exit-detector.ts` — Regex parser for `---RW_STATUS---` blocks in agent output (STATUS, EXIT_SIGNAL, SUMMARY)
  - `state.ts` — JSON persistence in `.rw/state.json`
  - `config.ts` — `.rw/` path constants and file readers
- **Utils** (`src/utils/`) — `git.ts` wraps git CLI via execa; `logger.ts` provides color-coded + file logging

**Agent communication protocol:** Agents emit structured status blocks that `exit-detector.ts` parses:
```
---RW_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
EXIT_SIGNAL: true | false
SUMMARY: one-line summary
---END_RW_STATUS---
```

## Tech Stack

TypeScript (strict, ES2022/ESNext), tsup for bundling, vitest for testing, Commander.js for CLI, execa for subprocesses, chalk for terminal output.

## `.rw/` Directory (User Projects)

Created by `rw init` in target repos. Contains `PROMPT.md`, `TODO.md`, `RULES.md`, `specs/`, `worktrees/`, `logs/`, `state.json`. Templates live in `templates/` and are embedded inline at build time (see `src/commands/init.ts`).
