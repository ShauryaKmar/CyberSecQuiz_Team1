const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selected: Number,
  correct: Boolean,
  timeTaken: Number  // seconds
}, { _id: false });

const resultSchema = new mongoose.Schema({
  name: String,
  email: String,
  department: String,
  score: Number,
  answers: [answerSchema],
  totalTime: Number,
  riskLevel: String,   // Low / Medium / High
  ip: String,          // optional, for admin use only
  userAgent: String,
  date: { type: Date, default: Date.now }
});

resultSchema.index({ email: 1 });
module.exports = mongoose.model('Result', resultSchema);
