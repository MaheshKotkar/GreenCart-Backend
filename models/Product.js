const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: 'Fresh quality product from GreenCart.'
    },
    price: {
        type: Number,
        required: true
    },
    oldPrice: {
        type: Number
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 5
    },
    reviews: {
        type: Number,
        default: 4
    },
    isActive: {
        type: Boolean,
        default: true
    },
    dateAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);
