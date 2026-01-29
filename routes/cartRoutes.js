const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   POST api/cart/update
// @desc    Update user cart data
router.post('/update', auth, async (req, res) => {
    try {
        const { cartData } = req.body;
        await User.findByIdAndUpdate(req.user.id, { cartData });
        res.json({ success: true, message: 'Cart updated' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/cart/get
// @desc    Get user cart data
router.get('/get', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.cartData || {});
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
