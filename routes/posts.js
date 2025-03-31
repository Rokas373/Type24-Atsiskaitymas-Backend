const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const auth = require('../middleware/auth');


router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().populate('owner', 'username');
        res.json(posts);
    } catch (err) {
        console.error('Get posts error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while fetching posts' });
    }
});

router.get('/:postId', auth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
            return res.status(400).json({ message: 'Invalid post ID' });
        }

        const post = await Post.findById(req.params.postId)
            .populate('owner', 'username')
            .populate('comments.user', 'username');
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        console.error('Get post by ID error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while fetching the post' });
    }
});


router.post('/', auth, async (req, res) => {
    const { title, description, imageUrl } = req.body;

    try {
        const post = new Post({
            title,
            description,
            imageUrl,
            owner: req.user.id,
        });
        await post.save();

        const populatedPost = await Post.findById(post._id).populate('owner', 'username');
        res.status(201).json(populatedPost);
    } catch (err) {
        console.error('Create post error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while creating the post' });
    }
});

router.post('/:postId/comment', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const newComment = {
            user: req.user.id,
            comment: req.body.comment,
            createdAt: new Date(),
        };

        post.comments.push(newComment);
        await post.save();

        const updatedPost = await Post.findById(post._id)
            .populate('owner', 'username')
            .populate('comments.user', 'username');
        res.json(updatedPost);
    } catch (err) {
        console.error('Add comment error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while adding the comment' });
    }
});

router.delete('/:postId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to delete this post' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Delete post error:', err.message, err.stack);
        res.status(500).json({ message: err.message || 'An error occurred while deleting the post' });
    }
});

module.exports = router;