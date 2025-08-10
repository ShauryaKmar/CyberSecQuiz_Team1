const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selected: Number,
  correct: Boolean,
  topic: String,
  timeTaken: Number
}, { _id: false });

const resultSchema = new mongoose.Schema({
  name: String,
  email: String,
  department: String,
  score: Number,
  totalTime: Number,
  answers: [answerSchema],
  riskLevel: String,
  userAgent: String,
  ip: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', resultSchema);
