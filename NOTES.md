# Notes — quality-crew

## What it does and how to install it

`quality-crew` is a code-quality plugin for Node/Express projects. One command, `/quality-crew:quality-check [folder]`, runs three subagents as a workflow: a reviewer and a coverage scout look at the code at the same time, then a test writer adds tests for everything they found and runs the suite, and the main session writes a short report. The plugin also ships a `test-conventions` skill (how tests are written in this kind of project) and a `PostToolUse` hook that runs ESLint `--fix` on every JavaScript file Claude edits.

Install it from this repo, which is also its marketplace:

```
/plugin marketplace add jpdrlik/claude-multi-agent-workflow
/plugin install quality-crew@quality-crew-marketplace
```

Or load it from a clone with `claude --plugin-dir .`.

## A scoping decision: who gets which tools and model

- `code-reviewer` and `coverage-scout` only get `Read, Grep, Glob`. Their job is to look, and a reviewer that can edit tends to "fix" things on its own, which hides the finding from the user and makes the review untrustworthy. Without write tools both can run in parallel without any risk of stepping on each other or on the test writer.
- `coverage-scout` runs on **haiku**: matching routes to the tests that call them is mechanical (list handlers, grep the tests, build a table), so the cheaper, faster model is enough. `code-reviewer` stays on **sonnet** because spotting real bugs (string vs number ids, missing 404s, state leaks) needs judgment.
- `test-writer` is the only agent with `Write, Edit, Bash`, and its instructions limit it further: it may only touch `tests/`, and Bash is only for `npm test`, `npm run lint` and `node --test`. It needs Bash because a test it can't run is a guess. It stays on **sonnet** because writing tests that pass against real behavior is the hardest step of the flow.

## An orchestration decision: what runs in parallel and what waits

- **Parallel (step 1): reviewer + scout.** They read the same code but neither needs the other's output, and both are read-only, so running them together cuts the wait roughly in half with no conflicts.
- **Sequential (step 2): test-writer waits for both.** Its input is the merged list of the reviewer's "edge cases worth a test" and the scout's "gaps". Starting it earlier would mean writing tests without knowing what is missing, or writing duplicate tests. It is also the only agent that writes files, so running it alone avoids two agents editing `tests/` at once.
- **Sequential (step 3): the report waits for the test writer** because it has to say which findings got a test, the final `npm test` result, and which possible bugs are still open.

## How it was tested

- `node .github/scripts/validate-plugin.js` passes, and `claude plugin validate .` passes with no warnings.
- `claude --plugin-dir .` from the repo root: the command shows as `/quality-crew:quality-check`, the agents as `quality-crew:code-reviewer`, `quality-crew:coverage-scout` and `quality-crew:test-writer`, and the skill as `quality-crew:test-conventions`. Running `/quality-crew:quality-check course-api` started the reviewer and the scout in the same turn (two Agent calls side by side), and only after both returned it started the test writer, then wrote the report.
- One thing I learned: with `--plugin-dir .` the whole repo is the plugin folder, and Claude Code treats files inside a loaded plugin as sensitive, so the test writer's Write/Edit on `course-api/tests/` was denied in headless runs even with `acceptEdits` (an interactive session asks instead). Installing the plugin from the marketplace and running from `course-api/` avoids it, because the plugin then loads from its own install path.
- Installed as a user would (`/plugin marketplace add` + `/plugin install quality-crew@quality-crew-marketplace`) and ran `/quality-crew:quality-check` inside `course-api/`: the reviewer and the scout ran in parallel, the test writer added `tests/health.test.js` and extended `tests/users.test.js` (38 tests: 31 pass, 0 fail, 7 `todo` marking possible bugs such as `/users/abc` returning 404 instead of 400), `npm run lint` was clean, and the hook ran after each Write (exit 0). Feeding the hook script a file with a lint error returns exit 2 with the ESLint report, which Claude sees.
- The tests the workflow wrote during testing were not committed; `course-api/` is left as provided so the next run starts from the same gaps.
