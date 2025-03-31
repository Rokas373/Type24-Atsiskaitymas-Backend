const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Favorite = require('../models/Favorite');
const Post = require('../models/Post');

router.get('/', auth, async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.user.id })
            .populate({
                path: 'post',
                populate: { path: 'owner', select: 'username' },
            });
        res.json(favorites);
    } catch (err) {
        console.error('Get favorites error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while fetching favorites' });
    }
});

router.post('/add', auth, async (req, res) => {
    const { postId } = req.body;

    try {
        if (!postId) {
            return res.status(400).json({ message: 'Post ID is required' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const existingFavorite = await Favorite.findOne({
            user: req.user.id,
            post: postId,
        });
        if (existingFavorite) {
            return res.status(400).json({ message: 'Post is already in favorites' });
        }

        const favorite = new Favorite({
            user: req.user.id,
            post: postId,
        });

        await favorite.save();
        res.status(201).json({ message: 'Post added to favorites' });
    } catch (err) {
        console.error('Add to favorites error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while adding to favorites' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const favorite = await Favorite.findById(req.params.id);
        if (!favorite) {
            return res.status(404).json({ message: 'Favorite not found' });
        }

        if (favorite.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only remove your own favorites' });
        }

        await favorite.deleteOne();
        res.json({ message: 'Favorite removed successfully' });
    } catch (err) {
        console.error('Remove favorite error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while removing the favorite' });
    }
});

module.exports = router;