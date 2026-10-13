require('dotenv').config();
const express = require('express');
console.log(process.env.MONGO_URI);
const mongoose = require('mongoose');

const app = express();
const port = 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Could not connect to MongoDB', err));

app.listen(port, () => console.log(`Server running on port ${port}`));
app.use(express.json());
app.use('/api/requests', require('./routes/requestRoutes'));
