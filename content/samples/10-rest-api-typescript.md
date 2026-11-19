---
title: Build a REST API with Node.js and TypeScript
slug: rest-api-with-node-and-typescript
kind: tutorial
category: programming
access: premium
summary: Design, build and test a small JSON API for a to-do app — routes, validation and error handling included.
tags: [typescript, node, backend, api]
author: Polymath Team
---

In this tutorial you will build a small but real JSON API for a to-do list using Node.js, Express and TypeScript, and learn the conventions that make APIs pleasant to use.

<!-- more -->

## 1. Set up the project

```bash
mkdir todo-api && cd todo-api
npm init -y
npm install express
npm install -D typescript tsx @types/express @types/node
npx tsc --init
```

## 2. Design the routes first

| Method | Path | Meaning |
|---|---|---|
| GET | /todos | List all to-dos |
| POST | /todos | Create a to-do |
| PATCH | /todos/:id | Update a to-do |
| DELETE | /todos/:id | Delete a to-do |

Nouns in the path, verbs in the HTTP method — that is the heart of REST.

## 3. Write the server

```typescript
import express, { type Request, type Response } from 'express';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const app = express();
app.use(express.json());

let todos: Todo[] = [];
let nextId = 1;

app.get('/todos', (_req: Request, res: Response) => {
  res.json(todos);
});

app.post('/todos', (req: Request, res: Response) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const todo: Todo = { id: nextId++, title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.patch('/todos/:id', (req: Request, res: Response) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  if (typeof req.body?.done === 'boolean') todo.done = req.body.done;
  if (typeof req.body?.title === 'string') todo.title = req.body.title.trim();
  res.json(todo);
});

app.delete('/todos/:id', (req: Request, res: Response) => {
  const before = todos.length;
  todos = todos.filter((t) => t.id !== Number(req.params.id));
  res.status(todos.length < before ? 204 : 404).end();
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));
```

Run it with `npx tsx server.ts`.

## 4. Try it

```bash
curl -X POST localhost:3000/todos -H 'Content-Type: application/json' -d '{"title":"Learn REST"}'
curl localhost:3000/todos
curl -X PATCH localhost:3000/todos/1 -H 'Content-Type: application/json' -d '{"done":true}'
```

## 5. Status codes that matter

- **200** OK — here is what you asked for
- **201** Created — returned after a successful `POST`
- **204** No Content — success with nothing to return (deletes)
- **400** Bad Request — the client sent invalid data
- **404** Not Found — no such resource

> [!TIP]
> Next, swap the in-memory array for a real database and add automated tests — the routes won't need to change at all.
