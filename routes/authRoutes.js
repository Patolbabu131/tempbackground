
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware to handle CORS
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specific methods
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-auth-token'); // Allow specific headers
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Handle preflight requests
    }
    next();
});

router.get('/rujal', async(req, res) => {
    res.json({ message: 'User rujal' });
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        // Check if user exists
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Only allow admin users to login
        if (user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admin users are allowed to log in" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid Password" });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Send success response with message
        res.json({ 
            success: true, 
            token, 
            message: "Login successful", 
            user: { id: user._id, email: user.email, role: user.role } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Token verification route remains unchanged, with a minor update to include success flag
router.post('/verify-token', (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, verified });
    } catch (err) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});




// ... Keep existing user login and token verification routes
module.exports = router;
