const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pwa_store';

app.use(cors());
app.use(express.json());

// --- Connect to MongoDB ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Mongo connection error:', err.message));

// --- Schemas ---
const productSchema = new mongoose.Schema({
  sku: String,
  name: String,
  description: String,
  price: Number,
  images: [String],
  stock: Number
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  clientOrderId: String,
  items: Array,
  totalAmount: Number,
  status: String
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// --- Health check ---
app.get('/_health', (req, res) => res.json({ ok: true }));

// --- DEMO LOGIN ENDPOINT ---
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  const token = Buffer.from(`${username}-demo`).toString('base64');
  res.json({ token, user: { name: username } });
});

// --- Products Endpoint ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().limit(100).lean().exec();
    res.json({ data: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Orders Endpoint (Improved with Idempotency & Conflict Handling) ---
app.post('/api/orders', async (req, res) => {
  const { clientOrderId, items, totalAmount } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Invalid items' });
  }

  try {
    // Idempotent behavior
    if (clientOrderId) {
      const existing = await Order.findOne({ clientOrderId }).exec();
      if (existing) {
        return res.json({ ok: true, existing: true, orderId: existing._id });
      }
    }

    // Basic conflict handling (check stock and product existence)
    const skus = items.map(i => i.sku);
    const products = await Product.find({ sku: { $in: skus } }).lean().exec();

    const conflicts = [];
    for (const it of items) {
      const prod = products.find(p => p.sku === it.sku);
      if (!prod) conflicts.push({ sku: it.sku, reason: 'not_found' });
      else if (it.quantity > prod.stock) conflicts.push({ sku: it.sku, reason: 'out_of_stock' });
    }

    if (conflicts.length) {
      return res.status(409).json({ ok: false, conflicts });
    }

    const order = new Order({ clientOrderId, items, totalAmount, status: 'received' });
    await order.save();

    res.json({ ok: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Static assets ---
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- Start Server ---
app.listen(PORT, () => {
  console.log('API running on port', PORT);
});
