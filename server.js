const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Root route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('File not found');
  }
});

// Dashboard route
app.get('/dashboard.html', (req, res) => {
  const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
  if (fs.existsSync(dashboardPath)) {
    res.sendFile(dashboardPath);
  } else {
    res.status(404).send('File not found');
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Activity Schema
const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain: { type: String, required: true },
  timeSpent: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Activity = mongoose.model('Activity', activitySchema);

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/productivity-tracker', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to MongoDB');

    // Create test user if it doesn't exist
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword
      });
      console.log('Test user created');
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Test credentials:');
      console.log('Email: test@example.com');
      console.log('Password: password123');
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Start the connection process
connectWithRetry();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/activity', authenticateToken, async (req, res) => {
  try {
    const { domain, timeSpent } = req.body;
    const activity = new Activity({
      userId: req.user.userId,
      domain,
      timeSpent
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    console.error('Activity tracking error:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

app.get('/api/activity/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activities = await Activity.find({
      userId: req.user.userId,
      timestamp: { $gte: today }
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}); 