const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema(
  {
    questionId: String,
    selected: { type: Number, default: null },
    correct: Boolean,
    topic: String,
    timeTaken: Number,
  },
  { _id: false }
);

const ResultSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    department: String,
    score: Number,
    totalTime: Number,
    answers: [AnswerSchema],
    userAgent: String,
    ip: String,
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", ResultSchema);
