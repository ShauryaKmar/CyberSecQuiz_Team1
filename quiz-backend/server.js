const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Result model
const Result = mongoose.model("Result", new mongoose.Schema({
  name: String,
  score: Number,
  total: Number,
  answers: [
    {
      questionId: String,
      correct: Boolean,
      topic: String
    }
  ],
  date: { type: Date, default: Date.now }
}));

// Admin analytics route
app.get("/admin/analytics", async (req, res) => {
  try {
    const results = await Result.find();

    // Calculate topic-wise incorrect counts
    let topicStats = {};
    results.forEach(result => {
      result.answers.forEach(ans => {
        if (!topicStats[ans.topic]) {
          topicStats[ans.topic] = { incorrect: 0, total: 0 };
        }
        topicStats[ans.topic].total++;
        if (!ans.correct) {
          topicStats[ans.topic].incorrect++;
        }
      });
    });

    // Convert to percentage
    let topicPerformance = Object.entries(topicStats).map(([topic, data]) => ({
      topic,
      incorrectRate: ((data.incorrect / data.total) * 100).toFixed(1)
    }));

    // Sort by highest incorrect rate
    topicPerformance.sort((a, b) => b.incorrectRate - a.incorrectRate);

    // Identify top 5 at-risk employees
    let riskEmployees = results
      .map(r => ({
        name: r.name,
        incorrect: r.total - r.score,
        score: r.score,
        total: r.total
      }))
      .sort((a, b) => b.incorrect - a.incorrect)
      .slice(0, 5);

    res.json({ topicPerformance, riskEmployees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching analytics" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running...");
});
