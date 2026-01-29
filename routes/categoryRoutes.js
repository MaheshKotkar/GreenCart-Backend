const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
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
        cb(null, `cat_${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// @route   GET api/category/list
// @desc    Get all categories
router.get('/list', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   POST api/category/add
// @desc    Add a new category
router.post('/add', upload.single('image'), async (req, res) => {
    try {
        const { name } = req.body;
        let imageData = '';

        if (req.file) {
            imageData = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        } else {
            return res.status(400).json({ success: false, message: 'Image is required' });
        }

        const newCategory = new Category({ name, image: imageData });
        await newCategory.save();

        res.json({ success: true, message: 'Category added successfully', category: newCategory });
    } catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }
        res.status(500).send('Server error');
    }
});

// @route   POST api/category/seed
// @desc    Seed default categories
router.post('/seed', async (req, res) => {
    try {
        const defaultCategories = [
            { name: 'Organic veggies', image: 'organic_vegitable_image.png' },
            { name: 'Fresh Fruits', image: 'fresh_fruits_image.png' },
            { name: 'Cold Drinks', image: 'bottles_image.png' },
            { name: 'Instant Food', image: 'maggi_image.png' },
            { name: 'Dairy Products', image: 'dairy_product_image.png' },
            { name: 'Bakery & Breads', image: 'bakery_image.png' },
            { name: 'Grains & Cereals', image: 'grain_image.png' },
            { name: 'Chips', image: 'Chips.png' },
        ];

        for (const cat of defaultCategories) {
            const exists = await Category.findOne({ name: cat.name });
            if (!exists) {
                const newCat = new Category({
                    name: cat.name,
                    image: `${req.protocol}://${req.get('host')}/uploads/${cat.image}`
                });
                await newCat.save();
            }
        }

        res.json({ success: true, message: 'Categories seeded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/category/delete/:id
// @desc    Delete a category
router.delete('/delete/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Category removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
