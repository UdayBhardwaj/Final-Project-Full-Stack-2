const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  sku: { type: String, unique: true, index: true },
  name: String,
  description: String,
  price: Number,
  images: [String],
  stock: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});
ProductSchema.index({ name: "text", description: "text" });
module.exports = mongoose.model('Product', ProductSchema);
