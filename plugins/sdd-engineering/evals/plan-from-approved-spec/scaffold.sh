#!/usr/bin/env bash
# Tiny host project for the SDD evals: own instructions, one module, a test command.
set -euo pipefail

mkdir -p src test
cat > CLAUDE.md <<'MD'
# Todo service

Small Node.js module that manages an in-memory todo list.

- Source: `src/`; tests: `test/` (Node's built-in test runner).
- Check command: `npm test` (runs `node --test`). No other checks exist.
- SDD artifacts live in `specs/<slug>/`.
- Protected: `package-lock.json`; never add dependencies without approval.
MD

cat > package.json <<'JSON'
{
  "name": "todo-service",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
JSON

cat > src/todos.js <<'JS'
const todos = [];

export function addTodo(title) {
  if (typeof title !== 'string' || title.trim() === '') throw new Error('title is required');
  const todo = { id: todos.length + 1, title: title.trim(), done: false };
  todos.push(todo);
  return todo;
}

export function listTodos() {
  return [...todos];
}

export function completeTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) throw new Error('todo not found');
  todo.done = true;
  return todo;
}
JS

cat > test/todos.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTodo, listTodos } from '../src/todos.js';

test('addTodo trims the title', () => {
  assert.equal(addTodo('  buy milk ').title, 'buy milk');
  assert.equal(listTodos().length, 1);
});
JS

# An approved spec from stage 1, so the run starts at the planning stage.
mkdir -p specs/todo-due-dates
cat > specs/todo-due-dates/spec.md <<'MD'
# Spec: Todo due dates
- **Key:** DUE · **Status:** Approved (2026-10-21) · **Date:** 2026-10-21 · **Areas:** src
- **Source request:** todos get an optional due date and an overdue-only listing.

## 1. Goals
Let a todo carry an optional due date and list only overdue todos.
## 2. Non-goals
Reminders, time zones other than UTC, persistence.
## 7. Functional requirements
- FR-1 `addTodo(title, { dueDate })` accepts an optional ISO date (YYYY-MM-DD) → AC-DUE-01, AC-DUE-02
- FR-2 `listTodos({ overdue: true })` returns only todos that are not done and whose due date is before today (UTC) → AC-DUE-03, AC-DUE-04
## 12. Acceptance criteria (EARS)
| AC-ID | EARS statement | Verification |
|---|---|---|
| AC-DUE-01 | When a todo is added with a valid dueDate, the service shall store it on the todo. | unit |
| AC-DUE-02 | If dueDate is not a valid YYYY-MM-DD date, then the service shall throw "invalid due date" and not add the todo. | unit |
| AC-DUE-03 | When listTodos is called with overdue: true, the service shall return only todos that are not done and whose due date is before today (UTC). | unit |
| AC-DUE-04 | When listTodos is called without options, the service shall return all todos as before. | unit |
## 15. Open questions
none
## 16. Approvals required
none
MD

git init -q
git add -A
git -c user.email=eval@example.com -c user.name=eval commit -q -m "initial todo service with approved spec"
