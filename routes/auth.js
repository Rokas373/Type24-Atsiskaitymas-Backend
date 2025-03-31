const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

router.post('/register', async (req, res) => {
    const { username, password, passwordTwo } = req.body;

    if (password !== passwordTwo) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({ username, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { id: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ user: { id: user.id, username: user.username }, token });
    } catch (err) {
        console.error('Register error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred during registration' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const payload = { id: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ user: { id: user.id, username: user.username }, token });
    } catch (err) {
        console.error('Login error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred during login' });
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ id: user.id, username: user.username });
    } catch (err) {
        console.error('Get user error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while fetching user data' });
    }
});

module.exports = router;