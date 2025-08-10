const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    answer: { type: Number, required: true }, // index in options
    explanation: { type: String },
    topic: { type: String, default: "General" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", QuestionSchema);
