const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farmex';
mongoose.connect(mongoURI)
  .then(() => console.log('Successfully connected to MongoDB Database.'))
  .catch((err) => {
    console.error('CRITICAL: MongoDB connection error. Please make sure MongoDB is running.');
    console.error(err.message);
    console.log('Server will proceed to run, but database actions will fail until MongoDB is connected.');
  });

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Fallback to serve index.html for undefined routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Farmex platform server running on http://localhost:${PORT}`);
});
