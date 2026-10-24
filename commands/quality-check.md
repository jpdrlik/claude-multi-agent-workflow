---
description: Run the quality crew on a project — review and coverage scan in parallel, then write the missing tests, then report.
argument-hint: "[project folder, default: current folder]"
---

Run the quality-crew workflow on the project in `$ARGUMENTS` (if empty, use the current folder). Call it the target below.

Follow these steps in order. Do not do the subagents' work yourself; delegate each step to the named subagent and pass along the target folder.

**Step 1 — in parallel.** These two do not depend on each other, so start both at the same time, in a single message with two Task calls:
- `code-reviewer`: review the application code of the target (`server.js`, `routes/`, `db/` and anything similar) and return its findings and the edge cases worth a test.
- `coverage-scout`: map every route and helper of the target to the tests that cover it and return the coverage map and the gaps.

Wait until both have returned.

**Step 2 — depends on step 1.** Merge the reviewer's "Edge cases worth a test" with the scout's "Gaps" into one list, dropping duplicates. Then delegate to `test-writer` with that list and the target folder. It must add the tests and run `npm test` until the suite passes.

**Step 3 — depends on step 2.** Write the final report yourself, from the three results:

```
# Quality check: <target>
## Review findings   (from code-reviewer, highest severity first)
## Tests added       (from test-writer)
## Suite result      (from test-writer)
## Still open        (review findings not fixed, possible bugs flagged by test-writer)
```

Keep the report short. Do not change application code in this workflow; findings are for the user to decide on.
