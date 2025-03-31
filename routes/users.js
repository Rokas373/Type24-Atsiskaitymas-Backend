const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Post = require('../models/Post');
const Message = require('../models/Message');

module.exports = (io) => {
    router.get('/', auth, async (req, res) => {
        try {
            const users = await User.find({ _id: { $ne: req.user.id } }).select('username photoUrl');
            res.json(users);
        } catch (err) {
            console.error('Get users error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while fetching users' });
        }
    });

    router.get('/:username', async (req, res) => {
        try {
            const user = await User.findOne({ username: req.params.username }).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ id: user._id, username: user.username, photoUrl: user.photoUrl });
        } catch (err) {
            console.error('Get user error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while fetching user data' });
        }
    });

    router.put('/update', auth, async (req, res) => {
        const { username, password, photoUrl } = req.body;

        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (username) user.username = username;
            if (photoUrl) user.photoUrl = photoUrl;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
            }

            await user.save();

            const updatedUser = { id: user._id, username: user.username, photoUrl: user.photoUrl };
            io.to(user.username).emit('userUpdated', updatedUser);

            res.json({ message: 'User updated successfully' });
        } catch (err) {
            console.error('Update user error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while updating user' });
        }
    });

    router.delete('/', auth, async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            await Post.deleteMany({ owner: req.user.id });
            await Message.deleteMany({ $or: [{ from: req.user.id }, { to: req.user.id }] });
            await user.deleteOne();

            res.json({ message: 'Account deleted successfully' });
        } catch (err) {
            console.error('Delete user error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while deleting the account' });
        }
    });

    return router;
};