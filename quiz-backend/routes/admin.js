// routes/admin.js
const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

function checkAdmin(req, res) {
  const key = req.get('x-api-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

router.get('/analytics', async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    // Pull everything once; compute safely in JS
    const results = await Result.find().lean();

    const safeAnswersLen = (r) => Array.isArray(r.answers) ? r.answers.length : 0;
    const safePct = (r) => {
      const total = safeAnswersLen(r);
      return total > 0 ? (r.score / total) * 100 : 0;
    };

    // Totals & averages
    const totalResponses = results.length;
    const averageScore = totalResponses
      ? results.reduce((sum, r) => sum + safePct(r), 0) / totalResponses
      : 0;

    const times = results
      .map(r => Number(r.totalTime))
      .filter(n => Number.isFinite(n) && n >= 0);
    const averageTime = times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    // Topic stats (wrong %)
    const topicBuckets = {};
    results.forEach(r => {
      (r.answers || []).forEach(a => {
        const topic = a.topic || 'General';
        if (!topicBuckets[topic]) topicBuckets[topic] = { total: 0, wrong: 0 };
        topicBuckets[topic].total += 1;
        if (!a.correct) topicBuckets[topic].wrong += 1;
      });
    });
    const topicStats = Object.entries(topicBuckets)
      .map(([topic, { total, wrong }]) => ({
        topic,
        wrongPct: total ? (wrong / total) * 100 : 0
      }))
      .sort((a, b) => b.wrongPct - a.wrongPct);

    // Department weaknesses (top 5 wrong topics per dept)
    const deptMap = {};
    results.forEach(r => {
      const dept = r.department || '—';
      if (!deptMap[dept]) deptMap[dept] = {};
      (r.answers || []).forEach(a => {
        if (!a.correct) {
          const topic = a.topic || 'General';
          deptMap[dept][topic] = (deptMap[dept][topic] || 0) + 1;
        }
      });
    });
    const departmentWeaknesses = Object.entries(deptMap).map(([department, topicsObj]) => ({
      department,
      weakTopics: Object.entries(topicsObj)
        .map(([topic, wrongCount]) => ({ topic, wrongCount }))
        .sort((x, y) => y.wrongCount - x.wrongCount)
        .slice(0, 5)
    }));

    // Score distribution
    const scoreDistribution = [
      { range: '0-50', count: 0 },
      { range: '51-70', count: 0 },
      { range: '71-100', count: 0 }
    ];
    results.forEach(r => {
      const pct = safePct(r);
      if (pct <= 50) scoreDistribution[0].count++;
      else if (pct <= 70) scoreDistribution[1].count++;
      else scoreDistribution[2].count++;
    });

    // Employees list (for table) + high risk
    const employees = results.map(r => ({
      name: r.name || '—',
      department: r.department || '—',
      score: Number(r.score) || 0,
      total: safeAnswersLen(r),
      pct: safePct(r)
    }));

    const highRisk = employees
      .filter(e => e.pct < 50)
      .sort((a, b) => a.pct - b.pct);

    res.json({
      totalResponses,
      averageScore,
      averageTime,
      topicStats,
      departmentWeaknesses,
      scoreDistribution,
      highRisk,
      employees
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
