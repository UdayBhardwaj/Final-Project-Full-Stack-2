const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pwa_store';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Mongo connection error:', err.message));

const productSchema = new mongoose.Schema({
  sku: { type: String, unique: true },
  name: String,
  description: String,
  price: Number,
  images: [String],
  stock: { type: Number, default: 0 }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  clientOrderId: { type: String, unique: true, sparse: true },
  items: Array,
  totalAmount: Number,
  status: { type: String, default: 'received' }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/_health', (req, res) => res.json({ ok: true }));

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { name: username } });
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().limit(100).lean().exec();
    res.json({ data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  const { clientOrderId, items, totalAmount } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid items' });
  }

  try {
    if (clientOrderId) {
      const existing = await Order.findOne({ clientOrderId }).exec();
      if (existing) return res.json({ ok: true, existing: true, orderId: existing._id });
    }

    const skus = items.map(i => i.sku);
    const products = await Product.find({ sku: { $in: skus } }).lean().exec();

    const conflicts = [];
    for (const it of items) {
      const prod = products.find(p => p.sku === it.sku);
      if (!prod) conflicts.push({ sku: it.sku, reason: 'not_found' });
      else if ((it.quantity || 1) > prod.stock) conflicts.push({ sku: it.sku, reason: 'out_of_stock' });
    }
    if (conflicts.length) return res.status(409).json({ ok: false, conflicts });

    const order = new Order({ clientOrderId, items, totalAmount, status: 'received' });
    await order.save();

    for (const it of items) {
      await Product.updateOne({ sku: it.sku }, { $inc: { stock: -(it.quantity || 1) } });
    }

    res.json({ ok: true, orderId: order._id });
  } catch (err) {
    if (err.code === 11000) return res.json({ ok: true, existing: true });
    res.status(500).json({ error: err.message });
  }
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.listen(PORT, () => console.log('API running on port', PORT));
