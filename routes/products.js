const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   GET api/products
// @desc    Get all products with optional filters (search, category, city/pincode location)
// @access  Public
router.get('/', async (req, res) => {
  const { search, category, location } = req.query;

  try {
    let query = {};

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by name (search query)
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Filter by location (nearby city or pincode)
    if (location) {
      // Find all farmers matching this city or pincode
      const matchingFarmers = await User.find({
        role: 'Farmer',
        $or: [
          { city: { $regex: location, $options: 'i' } },
          { pincode: { $regex: location, $options: 'i' } }
        ]
      }).select('_id');

      const farmerIds = matchingFarmers.map(f => f._id);
      query.farmer = { $in: farmerIds };
    }

    const products = await Product.find(query)
      .populate('farmer', 'name email phoneNumber city pincode')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Fetch products error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching products' });
  }
});

// @route   GET api/products/farmer/:farmerId
// @desc    Get all products for a specific farmer (e.g. for seller dashboard)
// @access  Public
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.params.farmerId })
      .populate('farmer', 'name email phoneNumber city pincode')
      .sort({ createdAt: -1 });

    res.json({ success: true, products });
  } catch (err) {
    console.error('Fetch farmer products error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching farmer products' });
  }
});

// @route   POST api/products
// @desc    Add a new product (Farmer or Admin only)
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, category, price, stockQuantity, unit, imageUrl } = req.body;

  try {
    // Validate role
    if (req.user.role !== 'Farmer' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only Farmers or Admins can list products.' });
    }

    const newProduct = new Product({
      name,
      category,
      price,
      stockQuantity,
      unit,
      imageUrl,
      farmer: req.user.id
    });

    const product = await newProduct.save();
    
    // Populate farmer info for return
    const populatedProduct = await Product.findById(product._id).populate('farmer', 'name email phoneNumber city pincode');

    res.status(201).json({ success: true, product: populatedProduct });
  } catch (err) {
    console.error('Create product error:', err.message);
    res.status(500).json({ success: false, message: 'Server error creating product' });
  }
});

// @route   PUT api/products/:id
// @desc    Update an existing product (Farmer owner or Admin only)
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { name, category, price, stockQuantity, unit, imageUrl } = req.body;

  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify owner or admin
    if (product.farmer.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update your own products.' });
    }

    // Update fields
    if (name) product.name = name;
    if (category) product.category = category;
    if (price !== undefined) product.price = price;
    if (stockQuantity !== undefined) product.stockQuantity = stockQuantity;
    if (unit) product.unit = unit;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;

    await product.save();
    const populatedProduct = await Product.findById(product._id).populate('farmer', 'name email phoneNumber city pincode');

    res.json({ success: true, product: populatedProduct });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating product' });
  }
});

// @route   DELETE api/products/:id
// @desc    Delete a product (Farmer owner or Admin only)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Verify owner or admin
    if (product.farmer.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own products.' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Product successfully deleted' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
});

module.exports = router;
