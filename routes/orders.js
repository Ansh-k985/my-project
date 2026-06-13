const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// @route   POST api/orders
// @desc    Place a new order (Customer only)
// @access  Private
router.post('/', auth, async (req, res) => {
  const { items, shippingAddress } = req.body;

  try {
    if (req.user.role !== 'Customer') {
      return res.status(403).json({ success: false, message: 'Access denied. Only Customers can place orders.' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shopping cart is empty' });
    }

    const orderItems = [];
    let totalAmount = 0;

    // Validate stock and prepare order items
    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.name}` });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity} ${product.unit}` 
        });
      }

      // Deduct stock quantity
      product.stockQuantity -= item.quantity;
      await product.save();

      // Push item detail
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price, // Record price at purchase
        farmer: product.farmer
      });

      totalAmount += product.price * item.quantity;
    }

    const newOrder = new Order({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress
    });

    const order = await newOrder.save();
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(500).json({ success: false, message: 'Server error placing order' });
  }
});

// @route   GET api/orders/customer
// @desc    Get order history of logged-in customer
// @access  Private
router.get('/customer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Customer') {
      return res.status(403).json({ success: false, message: 'Access denied. Only customers can view their histories.' });
    }

    const orders = await Order.find({ customer: req.user.id })
      .populate('items.product', 'name category unit imageUrl')
      .populate('items.farmer', 'name phoneNumber city pincode')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Fetch customer orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching order history' });
  }
});

// @route   GET api/orders/farmer
// @desc    Get orders containing products owned by the farmer
// @access  Private
router.get('/farmer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Farmer' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Farmer dashboard credentials required.' });
    }

    let orders;
    if (req.user.role === 'Admin') {
      // Admin sees all orders
      orders = await Order.find()
        .populate('customer', 'name email phoneNumber city pincode')
        .populate('items.product', 'name category unit imageUrl')
        .populate('items.farmer', 'name phoneNumber city pincode')
        .sort({ createdAt: -1 });
    } else {
      // Farmer only sees orders that contain their products
      orders = await Order.find({ 'items.farmer': req.user.id })
        .populate('customer', 'name email phoneNumber city pincode')
        .populate('items.product', 'name category unit imageUrl')
        .sort({ createdAt: -1 });
    }

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Fetch farmer orders error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching seller orders' });
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status (Farmer owner or Admin only)
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;

  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify authorized user: admin or the farmer who owns at least one item in this order
    const isOwner = order.items.some(item => item.farmer.toString() === req.user.id);
    if (!isOwner && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own items in this order.' });
    }

    order.status = status;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    console.error('Update order status error:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating order status' });
  }
});

module.exports = router;
