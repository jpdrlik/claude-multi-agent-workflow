# quality-crew

A Claude Code plugin that runs a small code-quality crew on a Node/Express project: it reviews the code and maps what is untested at the same time, then writes the missing tests and reports what is still open. This repo is both the plugin and the marketplace that offers it.

## Install

```
/plugin marketplace add jpdrlik/claude-multi-agent-workflow
/plugin install quality-crew@quality-crew-marketplace
```

On Claude Code 2.1.275 or later this also works in one step:

```
/plugin install quality-crew --marketplace jpdrlik/claude-multi-agent-workflow
```

To try it from a clone without installing: `claude --plugin-dir .` from the repo root. In that mode the repo itself is the plugin folder, so Claude Code asks before the test writer edits files under `course-api/` (headless runs deny it); the installed plugin doesn't have this limit.

## What's inside

| Piece | Name | What it does |
|---|---|---|
| Command | `/quality-crew:quality-check [folder]` | The workflow: review + coverage scan in parallel, then test writing, then a report |
| Subagent | `quality-crew:code-reviewer` | Read-only review (Read, Grep, Glob · sonnet) returning findings and edge cases worth a test |
| Subagent | `quality-crew:coverage-scout` | Read-only map of routes/helpers to tests (Read, Grep, Glob · haiku) returning the gaps |
| Subagent | `quality-crew:test-writer` | Writes tests in `tests/` and runs `npm test` (Read, Grep, Glob, Write, Edit, Bash · sonnet) |
| Skill | `quality-crew:test-conventions` | How tests are written here: `node:test`, `supertest`, `store.reset()`, one behavior per test |
| Hook | `PostToolUse` on Edit/Write | Runs the project's ESLint `--fix` on any edited `.js` file via `${CLAUDE_PLUGIN_ROOT}/scripts/lint-on-save.js`; problems it can't fix go back to Claude |

```
.claude-plugin/
  plugin.json          # manifest (name, version)
  marketplace.json     # marketplace catalog listing this plugin with source "./"
agents/                # code-reviewer, coverage-scout, test-writer
commands/              # quality-check (the workflow)
skills/test-conventions/SKILL.md
hooks/hooks.json
scripts/lint-on-save.js
course-api/            # the Express API used to test the plugin
```

## Usage

```
cd course-api && npm install && cd ..
claude --plugin-dir .
> /quality-crew:quality-check course-api
```

The subagents and skill can also be used on their own: "review course-api/routes/users.js", "what is untested in course-api?", or "add tests for PUT /users/:id".

## Versioning

The version lives in `.claude-plugin/plugin.json` (and is mirrored in the marketplace entry). Bump it on each release so installed copies pick up the update with `/plugin marketplace update`.

See [NOTES.md](NOTES.md) for the design decisions and how it was tested.
