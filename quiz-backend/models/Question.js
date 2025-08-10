const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: Number, required: true },
  explanation: { type: String, required: true },
  topic: { type: String } // optional: Phishing, Passwords etc.
});

module.exports = mongoose.model('Question', questionSchema);
