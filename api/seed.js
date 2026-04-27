/**
 * Simple seed script to populate products collection and save sample image files.
 * Run: node seed.js (requires MONGO_URI env or default to local)
 */
const mongoose = require('mongoose');
const Product = require('./models/Product');
const fs = require('fs');
const path = require('path');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pwa_store';

async function run(){
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  await Product.deleteMany({});
  const items = [
    { sku: 'SKU1', name: 'T-Shirt', description: 'Comfortable tee', price: 499, images: ['/assets/tshirt.jpg'], stock: 20 },
    { sku: 'SKU2', name: 'Mug', description: 'Ceramic mug', price: 199, images: ['/assets/mug.jpg'], stock: 50 },
    { sku: 'SKU3', name: 'Notebook', description: 'A5 notebook', price: 149, images: ['/assets/notebook.jpg'], stock: 100 }
  ];
  await Product.insertMany(items);
  // ensure assets folder exists and create placeholder files
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
  fs.writeFileSync(path.join(assetsDir,'tshirt.jpg'), 'placeholder image tshirt');
  fs.writeFileSync(path.join(assetsDir,'mug.jpg'), 'placeholder image mug');
  fs.writeFileSync(path.join(assetsDir,'notebook.jpg'), 'placeholder image notebook');
  console.log('Seeded products and wrote placeholder assets');
  process.exit(0);
}
run().catch(err=>{ console.error(err); process.exit(1); });
