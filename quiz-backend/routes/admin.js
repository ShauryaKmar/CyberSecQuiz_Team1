const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Question = require('../models/Question');
const { Parser } = require('json2csv'); // npm i json2csv

function checkAdmin(req, res) {
  const key = req.get('x-api-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// /api/admin/analytics
router.get('/analytics', async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    // total responses & average score
    const stats = await Result.aggregate([
      { $group: {
          _id: null,
          count: { $sum: 1 },
          avgScore: { $avg: { $multiply: [ { $divide: ["$score", { $size: "$answers" }] }, 100 ] } }
      } }
    ]);

    const totalResponses = stats[0]?.count || 0;
    const averageScore = stats[0]?.avgScore || 0;

    // topic-wise wrong %:
    const topicStats = await Result.aggregate([
      { $unwind: "$answers" },
      { $group: {
          _id: "$answers.topic",
          total: { $sum: 1 },
          wrong: { $sum: { $cond: [ "$answers.correct", 0, 1 ] } }
      } },
      { $project: {
          topic: "$_id",
          total: 1,
          wrong: 1,
          wrongPct: { $multiply: [ { $divide: ["$wrong", "$total"] }, 100 ] }
      }},
      { $sort: { wrongPct: -1 } }
    ]);

    // find high-risk employees (pct < 50)
    const highRisk = await Result.aggregate([
      { $addFields: { pct: { $multiply: [ { $divide: ["$score", { $size: "$answers" }] }, 100 ] } } },
      { $match: { pct: { $lt: 50 } } },
      { $project: { name:1, email:1, department:1, score:1, pct:1, date:1 } },
      { $sort: { pct: 1 } }
    ]);

    res.json({ totalResponses, averageScore, topicStats, highRisk });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// /api/admin/export  -> CSV of results
router.get('/export', async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const results = await Result.find().lean();

    // flatten answers count etc
    const rows = results.map(r => ({
      name: r.name,
      email: r.email,
      department: r.department,
      score: r.score,
      pct: (r.answers && r.answers.length) ? ((r.score / r.answers.length) * 100).toFixed(2) : '',
      totalTime: r.totalTime,
      date: r.date.toISOString()
    }));

    const parser = new Parser({ fields: ['name','email','department','score','pct','totalTime','date'] });
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('quiz_results.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/employee-weaknesses
router.get('/employee-weaknesses', async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const agg = await Result.aggregate([
      { $unwind: "$answers" },
      { $match: { "answers.correct": false } },
      { $group: {
         _id: { email: "$email", topic: "$answers.topic", name: "$name" },
         wrongCount: { $sum: 1 }
      }},
      { $group: {
         _id: "$_id.email",
         name: { $first: "$_id.name" },
         topics: { $push: { topic: "$_id.topic", wrongCount: "$wrongCount" } }
      }},
      { $project: {
         email: "$_id",
         name: 1,
         topics: 1
      }}
    ]);
    res.json(agg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


module.exports = router;
