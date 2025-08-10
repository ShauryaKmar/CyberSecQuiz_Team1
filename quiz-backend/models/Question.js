const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: Number, required: true },     // index of correct option
  explanation: { type: String, default: "" },
  topic: { type: String, default: "General" }   // NEW: topic tag
});

module.exports = mongoose.model('Question', questionSchema);
