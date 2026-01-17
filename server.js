const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize data file if it doesn't exist
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      user: { name: '', birthdate: '' },
      events: [],
      categories: ['Work', 'Education', 'Personal', 'Travel', 'Health', 'Relationships']
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read data from file
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return { user: {}, events: [], categories: [] };
  }
}

// Write data to file
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
    return false;
  }
}

// API Routes

// Get user profile
app.get('/api/user', (req, res) => {
  const data = readData();
  res.json(data.user);
});

// Update user profile
app.post('/api/user', (req, res) => {
  const data = readData();
  data.user = req.body;
  if (writeData(data)) {
    res.json({ success: true, user: data.user });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save user data' });
  }
});

// Get all events
app.get('/api/events', (req, res) => {
  const data = readData();
  res.json(data.events);
});

// Add new event
app.post('/api/events', (req, res) => {
  const data = readData();
  const newEvent = {
    id: Date.now().toString(),
    ...req.body
  };
  data.events.push(newEvent);
  if (writeData(data)) {
    res.json({ success: true, event: newEvent });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save event' });
  }
});

// Update event
app.put('/api/events/:id', (req, res) => {
  const data = readData();
  const index = data.events.findIndex(e => e.id === req.params.id);
  if (index !== -1) {
    data.events[index] = { ...data.events[index], ...req.body };
    if (writeData(data)) {
      res.json({ success: true, event: data.events[index] });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update event' });
    }
  } else {
    res.status(404).json({ success: false, error: 'Event not found' });
  }
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  const data = readData();
  const index = data.events.findIndex(e => e.id === req.params.id);
  if (index !== -1) {
    data.events.splice(index, 1);
    if (writeData(data)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete event' });
    }
  } else {
    res.status(404).json({ success: false, error: 'Event not found' });
  }
});

// Get all categories
app.get('/api/categories', (req, res) => {
  const data = readData();
  res.json(data.categories);
});

// Add new category
app.post('/api/categories', (req, res) => {
  const data = readData();
  const newCategory = req.body.name;
  if (!data.categories.includes(newCategory)) {
    data.categories.push(newCategory);
    if (writeData(data)) {
      res.json({ success: true, categories: data.categories });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save category' });
    }
  } else {
    res.status(400).json({ success: false, error: 'Category already exists' });
  }
});

// Initialize and start server
initDataFile();
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
