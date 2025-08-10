const express = require("express");
const router = express.Router();
const Question = require("../models/Question");

// Get all questions
router.get("/", async (_req, res) => {
  try {
    const questions = await Question.find().lean();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create question (simple admin tool; protect if you publish it)
router.post("/", async (req, res) => {
  try {
    const q = new Question(req.body);
    await q.save();
    res.json({ message: "Question added", id: q._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
