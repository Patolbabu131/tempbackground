const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');


 const lessonRoutes = require('./routes/lessonRoutes');


dotenv.config();

const app = express();


app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173','https://learningstake.netlify.app', 'http://localhost:5174', 'http://127.0.0.1:5174'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 3600
}));
// Ensure CORS headers are set for all responses
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

// Error handling for CORS preflight
app.options('*', cors());

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/users', userRoutes); // Register user routes
app.use('/api/auth', authRoutes); // Register auth routes
app.use('/api/courses', courseRoutes); // Register course routes
app.use('/api/lessons', lessonRoutes); // Register course routes
app.use('/uploads', express.static('uploads'));


const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});