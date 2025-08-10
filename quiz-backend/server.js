require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// CORS — lock to Netlify in production via env, otherwise "*"
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

// (Optional) request logging while debugging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Mongo connect
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Mount routes (NO parentheses)
const adminRoutes = require("./routes/admin");
const questionRoutes = require("./routes/questions");
const resultRoutes = require("./routes/results");

app.use("/api/admin", adminRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);

// Health check
app.get("/healthz", (_req, res) => res.send("ok"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
