const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => { // Changed endpoint to /register

    try {
        const { name, email, phone, password,role } = req.body; // Include phone
        const user = new User({ name, email, phone, password,role });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/all', async (req, res) => { // Changed endpoint to /all

    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/rujal', async(req, res) => {
    res.json({ message: 'User rujal' });
});
router.put('/update/:id', async (req, res) => { // Changed endpoint to /update/:id

    try {
        const { name, email, phone, password ,role} = req.body; // Include phone
        const updateData = { name, email, phone, password ,role };
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/delete/:id', async (req, res) => { // Changed endpoint to /delete/:id

    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;



