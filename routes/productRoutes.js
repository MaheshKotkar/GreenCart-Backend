const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// @route   GET api/product/list
// @desc    Get all products (for seller dashboard)
router.get('/list', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   GET api/product/active
// @desc    Get all active products (for public website)
router.get('/active', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true });
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/product/toggle
// @desc    Toggle product active status
router.post('/toggle', async (req, res) => {
    try {
        const { id } = req.body;
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        product.isActive = !product.isActive;
        await product.save();
        res.json({ success: true, isActive: product.isActive });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// @route   POST api/product/add
// @desc    Add one or multiple products (for management/seeding)
router.post('/add', upload.single('image'), async (req, res) => {
    try {
        let productData = req.body;

        // If file uploaded, convert to Base64 and store in DB
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
            const fileData = fs.readFileSync(filePath);
            const base64Image = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
            productData.image = base64Image;

            // Delete temp file
            fs.unlinkSync(filePath);
        }

        const newProduct = new Product(productData);
        await newProduct.save();

        res.json({ success: true, message: 'Product added successfully', product: newProduct });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/product/seed
// @desc    Seed initial products
router.post('/seed', async (req, res) => {
    try {
        const products = req.body.map(p => ({
            ...p,
            isActive: true,
            _id: undefined // Let MongoDB generate IDs
        }));
        await Product.deleteMany({});
        await Product.insertMany(products);
        res.json({ success: true, message: 'Products seeded successfully' });
    } catch (err) {
        console.error('Seed error:', err);
        res.status(500).json({ message: 'Server error during seeding', error: err.message });
    }
});

// @route   POST api/product/update
// @desc    Update an existing product
router.post('/update', upload.single('image'), async (req, res) => {
    try {
        console.log('Update Request Body:', req.body);
        console.log('Update Request File:', req.file);

        const { id, ...updateData } = req.body;

        if (!id) {
            console.log('Error: ID missing in request body');
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Find existing product
        const product = await Product.findById(id);
        if (!product) {
            console.log('Error: Product not found for ID:', id);
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Handle numeric fields
        if (updateData.price !== undefined && updateData.price !== '') {
            updateData.price = Number(updateData.price);
        } else {
            delete updateData.price;
        }

        if (updateData.oldPrice !== undefined && updateData.oldPrice !== '') {
            updateData.oldPrice = Number(updateData.oldPrice);
        } else {
            // If it's empty string, we might want to unset it or just remove it from updateData
            delete updateData.oldPrice;
        }

        // If a new image is uploaded, convert to Base64
        if (req.file) {
            const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
            const fileData = fs.readFileSync(filePath);
            const base64Image = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
            updateData.image = base64Image;
            console.log('Updated image to Base64');

            // Delete temp file
            fs.unlinkSync(filePath);
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        console.log('Product updated successfully:', updatedProduct.name);

        res.json({ success: true, message: 'Product updated successfully', product: updatedProduct });
    } catch (err) {
        console.error('Update Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Unknown error') });
    }
});

module.exports = router;
