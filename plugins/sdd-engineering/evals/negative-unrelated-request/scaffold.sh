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

git init -q
git add -A
git -c user.email=eval@example.com -c user.name=eval commit -q -m "initial todo service"
