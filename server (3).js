const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

let tasks = [
  { id: 1, text: 'Read the project brief', done: true },
  { id: 2, text: 'Design the API endpoints', done: false },
  { id: 3, text: 'Write validation logic', done: false },
];
let nextId = 4;

function validateTaskInput(body) {
  const errors = [];

  if (body.text === undefined) {
    errors.push('Field "text" is required.');
  } else if (typeof body.text !== 'string') {
    errors.push('Field "text" must be a string.');
  } else if (body.text.trim().length === 0) {
    errors.push('Field "text" cannot be empty.');
  } else if (body.text.length > 120) {
    errors.push('Field "text" must be under 120 characters.');
  }

  if (body.done !== undefined && typeof body.done !== 'boolean') {
    errors.push('Field "done" must be true or false.');
  }

  return errors;
}

app.get('/tasks', (req, res) => {
  const { done } = req.query;

  let result = tasks;
  if (done === 'true')  result = tasks.filter(t => t.done === true);
  if (done === 'false') result = tasks.filter(t => t.done === false);

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
});

app.get('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: `Task with id ${id} not found.`,
    });
  }

  res.status(200).json({ success: true, data: task });
});

app.post('/tasks', (req, res) => {
  const errors = validateTaskInput(req.body);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed.',
      details: errors,
    });
  }

  const newTask = {
    id: nextId++,
    text: req.body.text.trim(),
    done: req.body.done ?? false,
  };

  tasks.push(newTask);

  res.status(201).json({ success: true, data: newTask });
});

app.put('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({
      success: false,
      error: `Task with id ${id} not found.`,
    });
  }

  const errors = validateTaskInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed.',
      details: errors,
    });
  }

  task.text = req.body.text.trim();
  task.done = req.body.done ?? task.done;

  res.status(200).json({ success: true, data: task });
});

app.delete('/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Task with id ${id} not found.`,
    });
  }

  tasks.splice(index, 1);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} does not exist.`,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
});

app.listen(PORT, () => {
  console.log(`✅ Task API running at http://localhost:${PORT}`);
});
