const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// Simple risk calculation
function calculateRisk(score, quizLength) {
  const pct = (score / quizLength) * 100;
  if (pct >= 80) return 'Low';
  if (pct >= 50) return 'Medium';
  return 'High';
}

// POST save a result
router.post('/', async (req, res) => {
  try {
    const { name, email, department, score, answers, totalTime } = req.body;
    const riskLevel = calculateRisk(score, answers.length);
    const result = new Result({
      name, email, department, score, answers, totalTime,
      riskLevel,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    await result.save();
    res.json({ message: 'Result saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET results (admin). Protect with simple API key header x-api-key
router.get('/', async (req, res) => {
  try {
    const adminKey = req.get('x-api-key');
    if (adminKey !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

    const results = await Result.find().sort({ date: -1 }).limit(100);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
