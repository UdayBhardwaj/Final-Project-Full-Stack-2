const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Seed route (for demo) - not for production
router.post('/_seed', async (req,res)=>{
  const items = [
    { sku: 'SKU1', name: 'T-Shirt', description: 'Comfortable tee', price: 499, images: ['/assets/tshirt.jpg'], stock: 20 },
    { sku: 'SKU2', name: 'Mug', description: 'Ceramic mug', price: 199, images: ['/assets/mug.jpg'], stock: 50 },
  ];
  await Product.deleteMany({});
  await Product.insertMany(items);
  res.json({ seeded: items.length });
});

// GET /api/products?page=1&limit=20&q=
router.get('/', async (req,res)=>{
  const { page = 1, limit = 20, q } = req.query;
  const filter = {};
  if (q) filter.$text = { $search: q };
  const products = await Product.find(filter).skip((page-1)*limit).limit(Number(limit)).lean();
  const total = await Product.countDocuments(filter);
  res.json({ data: products, meta: { page: Number(page), limit: Number(limit), total }});
});

router.get('/:id', async (req,res)=>{
  const p = await Product.findById(req.params.id).lean();
  if (!p) return res.status(404).json({error:'not found'});
  res.json(p);
});

module.exports = router;
