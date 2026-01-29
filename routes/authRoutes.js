const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST api/auth/signup
// @desc    Register a new user
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({ name, email, password });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

const auth = require('../middleware/auth');

// @route   GET api/auth/user
// @desc    Get logged in user data
// @route   POST api/auth/seed-admin
// @desc    Seed admin user
router.post('/seed-admin', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });

        if (user) {
            // Update to admin if already exists (or just ignore)
            user.role = 'admin';
            user.password = await bcrypt.hash(password, 10); // Update pass just in case
            await user.save();
            return res.json({ success: true, message: 'Admin updated' });
        }

        user = new User({
            name: 'Seller Admin',
            email,
            password,
            role: 'admin'
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        res.json({ success: true, message: 'Admin created' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/user', auth, async (req, res) => {
    res.json(req.user);
});

// @route   GET api/auth/profile
// @desc    Get user profile with address
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/update-address
// @desc    Update user shipping address
router.put('/update-address', auth, async (req, res) => {
    try {
        const { address } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { address },
            { new: true }
        ).select('-password');

        res.json({ success: true, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
