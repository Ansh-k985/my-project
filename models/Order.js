const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  items: [
    {
      product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      },
      price: { 
        type: Number, 
        required: true 
      },
      farmer: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      }
    }
  ],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  shippingAddress: {
    phone: { 
      type: String, 
      required: true 
    },
    address: { 
      type: String, 
      required: true 
    },
    city: { 
      type: String, 
      required: true 
    },
    pincode: { 
      type: String, 
      required: true 
    }
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Dispatched', 'Delivered'], 
    default: 'Pending' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Order', OrderSchema);
