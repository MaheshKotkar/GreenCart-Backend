const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

const getMimetype = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp'
    };
    return map[ext] || 'image/png';
};

// @route   GET api/migrate/images-to-base64
// @desc    Convert all local image references to Base64 strings in DB
router.get('/images-to-base64', async (req, res) => {
    try {
        let updatedProducts = 0;
        let updatedCategories = 0;
        let errors = [];

        // 1. Migrate Products
        const products = await Product.find({});
        for (const product of products) {
            if (product.image && typeof product.image === 'string' && !product.image.startsWith('data:')) {
                try {
                    // Try to find the file locally
                    const filename = path.basename(product.image);
                    const filePath = path.join(__dirname, '..', 'uploads', filename);

                    if (fs.existsSync(filePath)) {
                        const fileData = fs.readFileSync(filePath);
                        const mimetype = getMimetype(filePath);
                        const base64Image = `data:${mimetype};base64,${fileData.toString('base64')}`;
                        product.image = base64Image;
                        await product.save();
                        updatedProducts++;
                    }
                } catch (e) {
                    errors.push(`Error migrating product ${product._id}: ${e.message}`);
                }
            }
        }

        // 2. Migrate Categories
        const categories = await Category.find({});
        for (const category of categories) {
            if (category.image && typeof category.image === 'string' && !category.image.startsWith('data:')) {
                try {
                    const filename = path.basename(category.image);
                    const filePath = path.join(__dirname, '..', 'uploads', filename);

                    if (fs.existsSync(filePath)) {
                        const fileData = fs.readFileSync(filePath);
                        const mimetype = getMimetype(filePath);
                        const base64Image = `data:${mimetype};base64,${fileData.toString('base64')}`;
                        category.image = base64Image;
                        await category.save();
                        updatedCategories++;
                    }
                } catch (e) {
                    errors.push(`Error migrating category ${category._id}: ${e.message}`);
                }
            }
        }

        res.json({
            success: true,
            message: 'Migration completed',
            summary: {
                updatedProducts,
                updatedCategories
            },
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err) {
        console.error('Migration failed:', err);
        res.status(500).json({ success: false, message: 'Migration failed', error: err.message });
    }
});

// @route   GET api/migrate/fix-product-categories
// @desc    Normalize product category names to match DB exactly
router.get('/fix-product-categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        const products = await Product.find({});
        let updatedCount = 0;
        let mapping = {}; // To log what was changed

        // Create a mapping map for easy lookup
        const catMap = {};
        categories.forEach(c => {
            catMap[c.name.toLowerCase().trim()] = c.name;
        });

        // Common manual mappings for defaults
        const aliasMap = {
            'vegetables': 'Organic veggies',
            'fruits': 'Fresh Fruits',
            'drinks': 'Cold Drinks',
            'instant': 'Instant Food',
            'grains': 'Grains & Cereals',
            'dairy': 'Dairy Products',
            'bakery': 'Bakery & Breads',
            'chips': 'Chips'
        };

        for (const product of products) {
            const currentCat = product.category ? product.category.toLowerCase().trim() : '';
            let targetCat = null;

            // 1. Check direct map
            if (catMap[currentCat]) {
                targetCat = catMap[currentCat];
            }
            // 2. Check alias map
            else if (aliasMap[currentCat]) {
                targetCat = aliasMap[currentCat];
            }

            // Update if different
            if (targetCat && product.category !== targetCat) {
                mapping[product.name] = `${product.category} -> ${targetCat}`;
                product.category = targetCat;
                await product.save();
                updatedCount++;
            }
        }

        res.json({
            success: true,
            updatedCount,
            mapping
        });
    } catch (err) {
        console.error('Category fix failed:', err);
        res.status(500).json({ success: false, message: 'Fix failed', error: err.message });
    }
});

module.exports = router;
