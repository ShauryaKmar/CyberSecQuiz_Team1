const express = require("express");
const router = express.Router();
const Result = require("../models/Result");
const Question = require("../models/Question");

function computeRisk(score, total) {
  const pct = total ? (score / total) * 100 : 0;
  if (pct >= 80) return "Low";
  if (pct >= 50) return "Medium";
  return "High";
}

// POST save result
router.post("/", async (req, res) => {
  try {
    const { name, email, department, answers: clientAnswers = [], totalTime } = req.body;

    const qIds = clientAnswers.map(a => a.questionId).filter(Boolean);
    const questions = await Question.find({ _id: { $in: qIds } }).lean();

    const qById = {};
    questions.forEach(q => { qById[q._id.toString()] = q; });

    let score = 0;
    const answers = clientAnswers.map(a => {
      const q = qById[a.questionId];
      const selected = typeof a.selected === "number" ? a.selected : null;
      const correct = q ? (selected === q.answer) : false;
      if (correct) score++;
      return {
        questionId: a.questionId,
        selected,
        correct,
        topic: q ? q.topic || "General" : "General",
        timeTaken: a.timeTaken || null
      };
    });

    const totalQuestions = answers.length;
    const riskLevel = computeRisk(score, totalQuestions);

    const result = new Result({
      name,
      email,
      department,
      score,
      totalTime,
      answers,
      riskLevel,
      userAgent: req.get("user-agent") || "",
      ip: req.ip
    });
    await result.save();

    res.json({ message: "Result saved", id: result._id, score, riskLevel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
