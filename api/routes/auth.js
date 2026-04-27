const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Demo login - accepts any username, returns JWT (not secure, demo only)
router.post('/login', async (req,res)=>{
  const { username } = req.body;
  if (!username) return res.status(400).json({error:'username required'});
  const payload = { sub: username, uid: uuidv4() };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

module.exports = router;
