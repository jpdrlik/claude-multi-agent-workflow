---
name: test-conventions
description: How to write API tests for a Node/Express project with node:test and supertest. Use when adding, fixing or reviewing tests in tests/, or when asked to cover a route with tests.
---

# Test conventions (node:test + supertest)

Use these rules whenever you add or change a test in a Node/Express project like `course-api/`.

## Setup

- Test runner: Node's built-in `node:test` with `node:assert`. Run with `npm test` (`node --test`). No Jest, no Mocha.
- HTTP calls: `supertest` against the exported app — `request(app)`. Never call `app.listen()` in a test; `server.js` only listens when run directly.
- One file per resource: `tests/<resource>.test.js` (for example `tests/users.test.js`, `tests/health.test.js`).

## Shape of a test file

```js
const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const store = require('../db/store');

test.beforeEach(() => store.reset());

test('PUT /users/:id returns 400 when the body is empty', async () => {
  const res = await request(app).put('/users/1').send({});
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { error: 'name or email is required' });
});
```

## Rules

1. Always reset the store in `test.beforeEach` so tests do not depend on each other.
2. One behavior per test. Name it `<METHOD> <path> <expected outcome>`, e.g. `GET /users/:id returns 404 for a missing user`.
3. Assert the status code first, then the body. For errors, assert the `{ error: '...' }` shape.
4. Use the seed data (`id 1` Ada Lovelace, `id 2` Alan Turing) instead of creating users when a test just needs one to exist; use `999` for a missing id.
5. For writes, check the change stuck: follow a `POST`/`PUT` with a `GET` when the behavior is "it was saved".
6. Do not mock `db/store.js`; the in-memory store is fast and is the real thing.
7. A test that exposes an app bug stays, marked `{ todo: 'bug: ...' }`, and the bug is reported. Do not change app code to make a test pass unless asked.
8. Finish by running `npm test` and `npm run lint`; both must be clean.
