const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  answer: Number,
  explanation: String,
  topic: String
});

module.exports = mongoose.model("Question", questionSchema);
