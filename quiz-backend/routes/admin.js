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

// routes/admin.js  (analytics endpoint)
router.get('/analytics', async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const results = await Result.find().lean();

    const safeLen = (r) => Array.isArray(r.answers) ? r.answers.length : 0;
    const pct = (r) => {
      const t = safeLen(r);
      return t > 0 ? (r.score / t) * 100 : 0;
    };

    const totalResponses = results.length;
    const averageScore = totalResponses
      ? results.reduce((s, r) => s + pct(r), 0) / totalResponses
      : 0;

    const times = results.map(r => Number(r.totalTime))
      .filter(n => Number.isFinite(n) && n >= 0);
    const averageTime = times.length ? times.reduce((a,b)=>a+b,0)/times.length : 0;

    const topicBuckets = {};
    results.forEach(r => (r.answers || []).forEach(a => {
      const topic = a.topic || 'General';
      topicBuckets[topic] ??= { total: 0, wrong: 0 };
      topicBuckets[topic].total++;
      if (!a.correct) topicBuckets[topic].wrong++;
    }));
    const topicStats = Object.entries(topicBuckets)
      .map(([topic, { total, wrong }]) => ({
        topic, wrongPct: total ? (wrong/total)*100 : 0
      }))
      .sort((a,b)=>b.wrongPct-a.wrongPct);

    const scoreDistribution = [
      { range:'0-50', count:0 },
      { range:'51-70', count:0 },
      { range:'71-100', count:0 }
    ];
    results.forEach(r => {
      const p = pct(r);
      if (p <= 50) scoreDistribution[0].count++;
      else if (p <= 70) scoreDistribution[1].count++;
      else scoreDistribution[2].count++;
    });

    const employees = results.map(r => ({
      name: r.name || '—',
      department: r.department || '—',
      score: Number(r.score) || 0,
      total: safeLen(r),
      pct: pct(r)
    }));

    const highRisk = employees.filter(e => e.pct < 50).sort((a,b)=>a.pct-b.pct);

    res.json({
      totalResponses,
      averageScore,
      averageTime,
      topicStats,
      scoreDistribution,
      highRisk,
      employees
    });
  } catch (err) {
    console.error('Admin analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});
