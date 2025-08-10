const express = require("express");
const router = express.Router();
const Result = require("../models/Result");
const Question = require("../models/Question");

// Save quiz result (server-verifies correctness)
router.post("/", async (req, res) => {
  try {
    const { name, email, department, answers: clientAnswers = [], totalTime } = req.body;

    const qIds = clientAnswers.map((a) => a.questionId).filter(Boolean);
    const questions = await Question.find({ _id: { $in: qIds } }).lean();
    const byId = {};
    questions.forEach((q) => (byId[q._id.toString()] = q));

    let score = 0;
    const answers = clientAnswers.map((a) => {
      const q = byId[a.questionId];
      const selected = Number.isFinite(a.selected) ? a.selected : null;
      const correct = q ? selected === q.answer : false;
      if (correct) score++;
      return {
        questionId: a.questionId,
        selected,
        correct,
        topic: q ? q.topic || "General" : "General",
        timeTaken: a.timeTaken || null,
      };
    });

    const result = new Result({
      name,
      email,
      department,
      score,
      totalTime,
      answers,
      userAgent: req.get("user-agent") || "",
      ip: req.ip,
    });

    await result.save();
    res.json({ message: "Result saved", id: result._id, score });
  } catch (err) {
    console.error("Save result error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
