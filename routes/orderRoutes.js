const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

// @route   POST api/order/place
// @desc    Place a new order (COD)
router.post('/place', auth, async (req, res) => {
    try {
        const { items, amount, paymentMethod, address } = req.body;

        const orderData = {
            userId: req.user.id,
            items,
            amount,
            address: address || 'Bangalore, Bangalore, Karnataka, India',
            paymentMethod,
            payment: false,
            date: Date.now(),
        };

        const newOrder = new Order(orderData);
        await newOrder.save();

        // Clear user cart in DB
        await User.findByIdAndUpdate(req.user.id, { cartData: {} });

        res.json({ success: true, message: 'Order Placed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/order/user-orders
// @desc    Get all orders for a user
router.get('/user-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user.id });
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/order/all-orders
// @desc    Get all orders for seller dashboard
router.get('/all-orders', async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ date: -1 });

        // Populate with user details (latest profile data)
        const ordersWithUsers = await Promise.all(
            orders.map(async (order) => {
                const user = await User.findById(order.userId).select('name email address');

                // Format user's current profile address if it exists
                let currentProfileAddress = '';
                if (user && user.address) {
                    const addr = user.address;
                    currentProfileAddress = [
                        addr.street,
                        addr.city,
                        addr.state,
                        addr.zipCode,
                        addr.country
                    ].filter(Boolean).join(', ');
                }

                return {
                    ...order.toObject(),
                    userName: user ? user.name : 'Unknown User',
                    userEmail: user ? user.email : 'No Email',
                    currentUserAddress: currentProfileAddress || order.address // Fallback to order snapshot
                };
            })
        );

        res.json(ordersWithUsers);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/order/update-status
// @desc    Update order payment status (Paid/Pending)
router.post('/update-status', async (req, res) => {
    try {
        const { orderId, payment } = req.body;

        console.log(`Updating status for order ${orderId} to payment: ${payment}`);

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            { payment: payment },
            { new: true }
        );

        if (!order) {
            console.log(`Order ${orderId} not found`);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        console.log(`Order ${orderId} updated successfully`);
        res.json({ success: true, message: 'Status Updated', order });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

module.exports = router;
