require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pwa_store';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const count = await Product.countDocuments();
  if (count > 0) {
    console.log(`Products already exist (${count} found) — skipping seed.`);
    process.exit(0);
  }

  const items = [
    { sku: 'SKU1', name: 'T-Shirt', description: 'Comfortable cotton tee', price: 499, images: ['/assets/tshirt.jpg'], stock: 20 },
    { sku: 'SKU2', name: 'Mug', description: 'Ceramic mug — 350ml', price: 199, images: ['/assets/mug.jpg'], stock: 50 },
    { sku: 'SKU3', name: 'Notebook', description: 'A5 ruled notebook', price: 149, images: ['/assets/notebook.jpg'], stock: 100 },
  ];

  await Product.insertMany(items);

  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

  console.log(`Seeded ${items.length} products.`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
