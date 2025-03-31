const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

module.exports = (io) => {
    router.get('/', auth, async (req, res) => {
        try {
            const messages = await Message.find({
                $or: [{ from: req.user.id }, { to: req.user.id }],
            })
                .populate('from', 'username')
                .populate('to', 'username')
                .sort({ createdAt: -1 });

            res.json(messages);
        } catch (err) {
            console.error('Get messages error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while fetching messages' });
        }
    });

    router.post('/send', auth, async (req, res) => {
        const { to, message } = req.body;

        try {
            const recipient = await User.findOne({ username: to });
            if (!recipient) {
                return res.status(404).json({ message: 'Recipient not found' });
            }

            if (!message) {
                return res.status(400).json({ message: 'Message is required' });
            }

            const newMessage = new Message({
                from: req.user.id,
                to: recipient._id,
                message,
                createdAt: new Date(),
                read: false, // Pridedame read lauką
            });

            await newMessage.save();

            const populatedMessage = await Message.findById(newMessage._id)
                .populate('from', 'username')
                .populate('to', 'username');

            io.to(recipient._id.toString()).emit('receiveMessage', populatedMessage);
            io.to(req.user.id.toString()).emit('receiveMessage', populatedMessage);

            res.json(populatedMessage);
        } catch (err) {
            console.error('Send message error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while sending the message' });
        }
    });

    router.put('/mark-read', auth, async (req, res) => {
        const { fromId } = req.body;

        try {
            await Message.updateMany(
                { from: fromId, to: req.user.id, read: false },
                { $set: { read: true } }
            );
            res.json({ message: 'Messages marked as read' });
        } catch (err) {
            console.error('Mark read error:', err.message, err.stack);
            res.status(500).json({ message: err.message || 'An error occurred while marking messages as read' });
        }
    });

    return router;
};