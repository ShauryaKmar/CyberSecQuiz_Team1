require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS: allow Netlify + local dev
const allowed = [process.env.FRONTEND_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'];
app.use(cors({ origin: "*" }));



// Routes
const questionsRoute = require('./routes/questions');
const resultsRoute = require('./routes/results');
app.use('/api/questions', questionsRoute);
app.use('/api/results', resultsRoute);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
