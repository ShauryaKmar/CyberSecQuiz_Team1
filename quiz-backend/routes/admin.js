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
    // Total responses & average score & avg time
    const stats = await Result.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgScore: {
            $avg: { $multiply: [{ $divide: ["$score", { $size: "$answers" }] }, 100] }
          },
          avgTime: { $avg: "$totalTime" }
        }
      }
    ]);

    const totalResponses = stats[0]?.count || 0;
    const averageScore = stats[0]?.avgScore || 0;
    const averageTime = stats[0]?.avgTime || 0;

    // Topic-wise wrong %
    const topicStats = await Result.aggregate([
      { $unwind: "$answers" },
      {
        $group: {
          _id: "$answers.topic",
          total: { $sum: 1 },
          wrong: { $sum: { $cond: ["$answers.correct", 0, 1] } }
        }
      },
      {
        $project: {
          topic: "$_id",
          wrongPct: { $multiply: [{ $divide: ["$wrong", "$total"] }, 100] }
        }
      },
      { $sort: { wrongPct: -1 } }
    ]);

    // Department weaknesses
    const departmentWeaknesses = await Result.aggregate([
      { $unwind: "$answers" },
      { $match: { "answers.correct": false } },
      {
        $group: {
          _id: { department: "$department", topic: "$answers.topic" },
          wrongCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.department",
          weakTopics: { $push: { topic: "$_id.topic", wrongCount: "$wrongCount" } }
        }
      }
    ]);

    // Score distribution
    const allResults = await Result.find().lean();
    const scoreDistribution = [
      { range: "0-50", count: 0 },
      { range: "51-70", count: 0 },
      { range: "71-100", count: 0 }
    ];
    allResults.forEach(r => {
      const pct = (r.score / r.answers.length) * 100;
      if (pct <= 50) scoreDistribution[0].count++;
      else if (pct <= 70) scoreDistribution[1].count++;
      else scoreDistribution[2].count++;
    });

    // High risk employees
    const highRisk = allResults
      .map(r => ({
        name: r.name,
        department: r.department,
        pct: (r.score / r.answers.length) * 100
      }))
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
      allResults
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
