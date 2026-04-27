const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Create order with clientOrderId for idempotency
router.post('/', auth, async (req,res)=>{
  const { clientOrderId, items, totalAmount } = req.body;
  if (!clientOrderId) return res.status(400).json({ error: 'clientOrderId required' });
  try {
    const existing = await Order.findOne({ clientOrderId });
    if (existing) return res.json({ order: existing, duplicate: true });

    for (const it of items) {
      const prod = await Product.findOne({ sku: it.sku });
      if (!prod) return res.status(400).json({ error: 'invalid sku '+it.sku });
      if (prod.stock < it.quantity) return res.status(409).json({ error: 'stock_insufficient', sku: it.sku });
      prod.stock = prod.stock - it.quantity;
      await prod.save();
      it.priceAtPurchase = prod.price;
      it.productId = prod._id;
    }

    const order = await Order.create({ clientOrderId, items, totalAmount });
    res.status(201).json({ order });
  } catch(err){
    if (err.code === 11000) {
      const order = await Order.findOne({ clientOrderId });
      return res.json({ order, duplicate: true });
    }
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
