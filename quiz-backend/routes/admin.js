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

// Main admin insights (use this instead of /analytics to avoid ad blockers)
router.get("/insights", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const results = await Result.find().lean();

    const safeLen = (r) => (Array.isArray(r.answers) ? r.answers.length : 0);
    const pct = (r) => {
      const t = safeLen(r);
      return t > 0 ? (r.score / t) * 100 : 0;
    };

    const totalResponses = results.length;
    const averageScore =
      totalResponses ? results.reduce((s, r) => s + pct(r), 0) / totalResponses : 0;

    const times = results
      .map((r) => Number(r.totalTime))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const averageTime = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    // Topic stats
    const topicBuckets = {};
    results.forEach((r) =>
      (r.answers || []).forEach((a) => {
        const topic = a.topic || "General";
        topicBuckets[topic] ??= { total: 0, wrong: 0 };
        topicBuckets[topic].total++;
        if (!a.correct) topicBuckets[topic].wrong++;
      })
    );
    const topicStats = Object.entries(topicBuckets)
      .map(([topic, { total, wrong }]) => ({
        topic,
        wrongPct: total ? (wrong / total) * 100 : 0,
      }))
      .sort((a, b) => b.wrongPct - a.wrongPct);

    // Score distribution
    const scoreDistribution = [
      { range: "0-50", count: 0 },
      { range: "51-70", count: 0 },
      { range: "71-100", count: 0 },
    ];
    results.forEach((r) => {
      const p = pct(r);
      if (p <= 50) scoreDistribution[0].count++;
      else if (p <= 70) scoreDistribution[1].count++;
      else scoreDistribution[2].count++;
    });

    // Employees list + high risk
    const employees = results.map((r) => ({
      name: r.name || "—",
      email: r.email || "—",
      department: r.department || "—",
      score: Number(r.score) || 0,
      total: safeLen(r),
      pct: pct(r),
    }));

    const highRisk = employees.filter((e) => e.pct < 50).sort((a, b) => a.pct - b.pct);

    res.json({
      totalResponses,
      averageScore,
      averageTime,
      topicStats,
      scoreDistribution,
      highRisk,
      employees,
    });
  } catch (err) {
    console.error("Admin insights error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Backward-compat: if you still hit /analytics from old frontends
router.get("/analytics", async (req, res) => {
  req.url = "/insights";
  router.handle(req, res);
});

// GET /api/admin/employee?email=someone@team1.in
// Returns profile, summary, topic weaknesses, and last attempt details
router.get("/employee", async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const email = (req.query.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email query param is required" });

    // pull all attempts for this user (latest first)
    const attempts = await Result.find({ email })
      .sort({ date: -1 })
      .lean();

    if (!attempts.length) {
      return res.json({
        profile: { name: "—", email, department: "—", attempts: 0 },
        summary: { avgScore: 0, lastScore: 0, avgTime: 0, weakTopics: [] },
        attempts: []
      });
    }

    // compute summary
    const safeLen = (r) => Array.isArray(r.answers) ? r.answers.length : 0;
    const pct = (r) => {
      const t = safeLen(r);
      return t > 0 ? (r.score / t) * 100 : 0;
    };

    const avgScore = attempts.reduce((s, r) => s + pct(r), 0) / attempts.length;
    const times = attempts.map(a => Number(a.totalTime)).filter(n => Number.isFinite(n) && n >= 0);
    const avgTime = times.length ? (times.reduce((a,b)=>a+b,0) / times.length) : 0;
    const last = attempts[0];

    // topic weaknesses (all attempts)
    const topicCount = {};
    attempts.forEach(r => (r.answers || []).forEach(a => {
      if (!a.correct) topicCount[a.topic || "General"] = (topicCount[a.topic || "General"] || 0) + 1;
    }));
    const weakTopics = Object.entries(topicCount)
      .map(([topic, wrongCount]) => ({ topic, wrongCount }))
      .sort((a,b)=>b.wrongCount - a.wrongCount)
      .slice(0, 8);

    // enrich last attempt answers with question text/options
    const qIds = (last.answers || []).map(a => a.questionId).filter(Boolean);
    const Question = require("../models/Question");
    const qDocs = await Question.find({ _id: { $in: qIds } }).lean();
    const qById = {};
    qDocs.forEach(q => { qById[q._id.toString()] = q; });

    const lastAnswers = (last.answers || []).map(a => {
      const q = qById[a.questionId];
      const selectedText = (q && Number.isFinite(a.selected)) ? q.options[a.selected] : (a.selected === null ? "(no answer)" : "");
      const correctText  = q ? q.options[q.answer] : "";
      return {
        question: q ? q.question : "(question not found)",
        topic: a.topic || (q ? q.topic : "General"),
        selectedIndex: a.selected,
        selectedText,
        correctIndex: q ? q.answer : null,
        correctText,
        correct: a.correct,
        timeTaken: a.timeTaken ?? null
      };
    });

    res.json({
      profile: {
        name: last.name || "—",
        email,
        department: last.department || "—",
        attempts: attempts.length
      },
      summary: {
        avgScore,
        lastScore: pct(last),
        avgTime,
        weakTopics
      },
      attempts: attempts.map(a => ({
        date: a.date,
        score: a.score,
        total: safeLen(a),
        pct: pct(a),
        totalTime: a.totalTime ?? null,
        id: a._id
      })),
      lastAttempt: {
        date: last.date,
        score: last.score,
        total: safeLen(last),
        pct: pct(last),
        totalTime: last.totalTime ?? null,
        answers: lastAnswers
      }
    });
  } catch (err) {
    console.error("Admin employee detail error:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
