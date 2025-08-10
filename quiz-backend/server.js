const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// CORS
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));

// Body parser
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Import route files
const adminRoutes = require("./routes/admin");
const questionRoutes = require("./routes/questions");
const resultRoutes = require("./routes/results");

// Mount routes
app.use("/api/admin", adminRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
