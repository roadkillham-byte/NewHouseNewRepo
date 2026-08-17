# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project

`NewHouseNewRepo` — a new project in its initial setup phase.

**No language or framework has been chosen yet.** There is no application
code, no dependency manifest, and no test suite. Do not assume a stack;
if a task implies one, confirm the choice before scaffolding it.

## Commands

None yet. When a toolchain is added, record the real commands here — install,
build, test, lint, run — so future sessions do not have to rediscover them.

| Task    | Command      |
| ------- | ------------ |
| Install | _not set up_ |
| Build   | _not set up_ |
| Test    | _not set up_ |
| Lint    | _not set up_ |

## Conventions

- **Branches:** work on a feature branch, never commit directly to `main`.
- **Commits:** short imperative subject line (`Add user auth`, not
  `Added user auth`). Explain the why in the body when it is not obvious.
- **Scope:** keep changes focused on what was asked. Flag adjacent problems
  rather than silently fixing them in the same commit.

## Keeping this file current

This file is only useful if it stays true. Update it in the same change that
makes it stale — especially the Commands table once a toolchain lands, and the
Project section once the stack is decided.
