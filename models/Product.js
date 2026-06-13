const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  category: { 
    type: String, 
    required: true, 
    enum: ['Fruits', 'Vegetables', 'Grains', 'Organic Fertilizers'] 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  stockQuantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  unit: { 
    type: String, 
    required: true, 
    trim: true 
  },
  imageUrl: { 
    type: String, 
    default: '' 
  },
  farmer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Product', ProductSchema);
