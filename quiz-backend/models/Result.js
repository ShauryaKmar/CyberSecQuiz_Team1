const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  name: String,
  email: String,
  department: String,
  score: Number,
  totalTime: Number,
  answers: [
    {
      questionId: String,
      selected: Number,
      correct: Boolean,
      topic: String,
      timeTaken: Number
    }
  ],
  riskLevel: String,
  date: { type: Date, default: Date.now },
  userAgent: String,
  ip: String
});

module.exports = mongoose.model("Result", resultSchema);
