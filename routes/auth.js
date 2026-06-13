const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, role, phoneNumber, city, pincode } = req.body;

  try {
    if (email.toLowerCase() === 'admin@farmex.com' || role === 'Admin') {
      return res.status(400).json({ success: false, message: 'Administrator registration is restricted' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user instance (password hashed via pre-save hook in User model)
    user = new User({
      name,
      email,
      password,
      role: role || 'Customer',
      phoneNumber,
      city,
      pincode
    });

    await user.save();

    // Generate JWT Token
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        city: user.city,
        pincode: user.pincode
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'farmex_super_secret_jwt_key_2026',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            city: user.city,
            pincode: user.pincode
          }
        });
      }
    );

  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for hardcoded Admin credentials
    if (email === 'admin@farmex.com' && password === 'admin1234') {
      const payload = {
        user: {
          id: 'admin_fixed_id_2026',
          name: 'System Admin',
          role: 'Admin',
          city: 'Headquarters',
          pincode: '000000'
        }
      };

      return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'farmex_super_secret_jwt_key_2026',
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          return res.json({
            success: true,
            token,
            user: {
              id: 'admin_fixed_id_2026',
              name: 'System Admin',
              email: 'admin@farmex.com',
              role: 'Admin',
              city: 'Headquarters',
              pincode: '000000'
            }
          });
        }
      );
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT Token
    const payload = {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        city: user.city,
        pincode: user.pincode
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'farmex_super_secret_jwt_key_2026',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            city: user.city,
            pincode: user.pincode
          }
        });
      }
    );

  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   GET api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.id === 'admin_fixed_id_2026') {
      return res.json({
        success: true,
        user: {
          id: 'admin_fixed_id_2026',
          name: 'System Admin',
          email: 'admin@farmex.com',
          role: 'Admin',
          city: 'Headquarters',
          pincode: '000000'
        }
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    console.error('Fetch user error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
});

// @route   GET api/auth/admin/stats
// @desc    Get platform stats (Admin only)
// @access  Private/Admin
router.get('/admin/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
    }

    const totalFarmers = await User.countDocuments({ role: 'Farmer' });
    const totalCustomers = await User.countDocuments({ role: 'Customer' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Calculate total revenue
    const orders = await Order.find({ status: 'Delivered' });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      success: true,
      stats: {
        totalFarmers,
        totalCustomers,
        totalProducts,
        totalOrders,
        totalRevenue
      }
    });
  } catch (err) {
    console.error('Fetch admin stats error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching platform statistics' });
  }
});

module.exports = router;
