const express = require("express");
const router = express.Router();
const Result = require("../models/Result");

function checkAdmin(req, res) {
  const key = req.get("x-api-key");
  if (!key || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET analytics
router.get("/analytics", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const stats = await Result.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgScore: { $avg: { $multiply: [{ $divide: ["$score", { $size: "$answers" }] }, 100] } }
        }
      }
    ]);

    const totalResponses = stats[0]?.count || 0;
    const averageScore = stats[0]?.avgScore || 0;

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
          total: 1,
          wrong: 1,
          wrongPct: { $multiply: [{ $divide: ["$wrong", "$total"] }, 100] }
        }
      },
      { $sort: { wrongPct: -1 } }
    ]);

    const highRisk = await Result.aggregate([
      {
        $addFields: {
          pct: { $multiply: [{ $divide: ["$score", { $size: "$answers" }] }, 100] }
        }
      },
      { $match: { pct: { $lt: 50 } } },
      { $project: { name: 1, email: 1, department: 1, pct: 1 } },
      { $sort: { pct: 1 } }
    ]);

    res.json({ totalResponses, averageScore, topicStats, highRisk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
