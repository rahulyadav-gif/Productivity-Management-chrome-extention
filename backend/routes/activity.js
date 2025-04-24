const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

// Mock activity data
let activities = [
  {
    domain: 'example.com',
    timeSpent: 120, // in minutes
    productivityScore: 80
  }
];

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // In a real app, we would verify the JWT token here
  if (!token.startsWith('mock-token-')) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next();
};

// Get today's activity
router.get('/today', verifyToken, (req, res) => {
  res.json({
    activities,
    productivityScore: activities.reduce((sum, a) => sum + a.productivityScore, 0) / activities.length
  });
});

// Add new activity
router.post('/', verifyToken, (req, res) => {
  const { domain, timeSpent, productivityScore } = req.body;
  
  activities.push({
    domain,
    timeSpent,
    productivityScore
  });
  
  res.status(201).json({ message: 'Activity recorded' });
});

// Update activity
router.post('/update', auth, async (req, res) => {
  try {
    const { domain, timeSpent, category } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activity = await Activity.findOne({
      userId: req.user.userId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!activity) {
      activity = new Activity({
        userId: req.user.userId,
        activities: []
      });
    }

    const existingActivity = activity.activities.find(a => a.domain === domain);
    if (existingActivity) {
      existingActivity.timeSpent += timeSpent;
    } else {
      activity.activities.push({ domain, timeSpent, category });
    }

    // Calculate productivity score
    const totalTime = activity.activities.reduce((sum, a) => sum + a.timeSpent, 0);
    const productiveTime = activity.activities
      .filter(a => a.category === 'productive')
      .reduce((sum, a) => sum + a.timeSpent, 0);

    activity.productivityScore = (productiveTime / totalTime) * 100;
    await activity.save();

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;