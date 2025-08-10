const express = require('express');
const router = express.Router();
const Result = require('../models/Result');       // create/update next
const Question = require('../models/Question');

// Helper: compute risk level (percent-based)
function computeRisk(score, total) {
  const pct = total ? (score / total) * 100 : 0;
  if (pct >= 80) return 'Low';
  if (pct >= 50) return 'Medium';
  return 'High';
}

// POST /api/results  (save result)
router.post('/', async (req, res) => {
  try {
    const { name, email, department, answers: clientAnswers = [], totalTime } = req.body;

    // fetch all question docs referenced
    const qIds = clientAnswers.map(a => a.questionId).filter(Boolean);
    const questions = await Question.find({ _id: { $in: qIds } }).lean();

    // map by id
    const qById = {};
    questions.forEach(q => { qById[q._id.toString()] = q; });

    // build server-verified answers array
    let score = 0;
    const answers = clientAnswers.map(a => {
      const q = qById[a.questionId];
      const selected = typeof a.selected === 'number' ? a.selected : null;
      const correct = q ? (selected === q.answer) : false;
      if (correct) score++;
      return {
        questionId: a.questionId,
        selected,
        correct,
        topic: q ? q.topic || 'General' : 'General',
        timeTaken: a.timeTaken || null
      };
    });

    // save result
    const totalQuestions = answers.length;
    const riskLevel = computeRisk(score, totalQuestions);
    const result = new Result({
      name, email, department, score, totalTime, answers, riskLevel,
      userAgent: req.get('user-agent') || '',
      ip: req.ip
    });
    await result.save();

    res.json({ message: 'Result saved', id: result._id, score, riskLevel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoints (protected by x-api-key)
function checkAdmin(req, res) {
  const key = req.get('x-api-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// GET /api/results  (admin list recent)
router.get('/', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  const results = await Result.find().sort({ date: -1 }).limit(500).lean();
  res.json(results);
});

module.exports = router;
