const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const User = require('../models/User');

// @route   POST api/payment/create-checkout-session
// @desc    Create Stripe checkout session for online payment
router.post('/create-checkout-session', auth, async (req, res) => {
    try {
        const { items, amount, address } = req.body;

        // Create line items for Stripe
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    description: `Quantity: ${item.quantity}`
                },
                unit_amount: Math.round((item.price / item.quantity) * 100), // Convert to cents
            },
            quantity: item.quantity,
        }));

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
            metadata: {
                userId: req.user.id,
                items: JSON.stringify(items),
                amount: amount.toString(),
                address: address || 'Bangalore, Bangalore, Karnataka, India'
            }
        });

        res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
        console.error('Stripe session error:', err);
        res.status(500).json({ message: 'Error creating checkout session' });
    }
});

// @route   POST api/payment/verify-session
// @desc    Verify Stripe payment and create order
router.post('/verify-session', auth, async (req, res) => {
    try {
        const { sessionId } = req.body;

        // Check if order already exists with this session ID (prevent duplicates)
        const existingOrder = await Order.findOne({ stripeSessionId: sessionId });

        if (existingOrder) {
            // Order already created, return existing order
            return res.json({
                success: true,
                message: 'Order already exists',
                orderId: existingOrder._id,
                alreadyExists: true
            });
        }

        // Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const metadata = session.metadata;

            // Create order in database
            const orderData = {
                userId: metadata.userId,
                items: JSON.parse(metadata.items),
                amount: parseFloat(metadata.amount),
                address: metadata.address,
                paymentMethod: 'Stripe',
                payment: true,
                stripeSessionId: sessionId,
                date: Date.now(),
            };

            const newOrder = new Order(orderData);
            await newOrder.save();

            // Clear user cart
            await User.findByIdAndUpdate(metadata.userId, { cartData: {} });

            res.json({
                success: true,
                message: 'Payment verified and order placed',
                orderId: newOrder._id,
                alreadyExists: false
            });
        } else {
            res.status(400).json({ message: 'Payment not completed' });
        }
    } catch (err) {
        console.error('Payment verification error:', err);
        res.status(500).json({ message: 'Error verifying payment' });
    }
});

module.exports = router;
