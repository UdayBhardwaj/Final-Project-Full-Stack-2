const mongoose = require('mongoose');
const OrderSchema = new mongoose.Schema({
  clientOrderId: { type: String, index: true },
  items: [{
    sku: String,
    productId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    priceAtPurchase: Number
  }],
  totalAmount: Number,
  status: { type: String, enum: ['pending','paid','failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
OrderSchema.index({ clientOrderId: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('Order', OrderSchema);
