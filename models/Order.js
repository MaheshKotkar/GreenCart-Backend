const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    items: {
        type: Array,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true,
        default: 'Bangalore, Bangalore, Karnataka, India'
    },
    status: {
        type: String,
        required: true,
        default: 'Order Placed'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    payment: {
        type: Boolean,
        required: true,
        default: false
    },
    stripeSessionId: {
        type: String,
        required: false
    },
    date: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Order', orderSchema);
