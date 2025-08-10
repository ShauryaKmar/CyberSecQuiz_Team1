const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

// Routes
const questionRoutes = require("./routes/questions");
const resultRoutes = require("./routes/results");
const adminRoutes = require("./routes/admin");

app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/admin", adminRoutes);

// Connect DB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 5000, () => {
      console.log("🚀 Server running...");
    });
  })
  .catch(err => console.error("Mongo connection error:", err));
