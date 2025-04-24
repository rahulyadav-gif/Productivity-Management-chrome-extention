const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  activities: [{
    domain: String,
    timeSpent: Number,
    category: {
      type: String,
      enum: ['productive', 'neutral', 'distracting']
    }
  }],
  productivityScore: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Activity', activitySchema);