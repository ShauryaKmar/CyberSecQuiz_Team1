const express = require("express");
const router = express.Router();
const Question = require("../models/Question");

// GET all questions
router.get("/", async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add question (admin use)
router.post("/", async (req, res) => {
  try {
    const q = new Question(req.body);
    await q.save();
    res.json({ message: "Question added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
