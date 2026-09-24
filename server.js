const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Lidhje me PostgreSQL është aktive');
});

pool.on('error', (err) => {
  console.error('❌ Gabim në lidhjen PostgreSQL:', err);
});

// Initialize database
async function initializeDB() {
  try {
    const client = await pool.connect();
    
    // Create products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        brand VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        size VARCHAR(50),
        price DECIMAL(10, 2),
        gender VARCHAR(50),
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        customer_address VARCHAR(255),
        customer_city VARCHAR(100),
        customer_zip VARCHAR(20),
        payment_method VARCHAR(50),
        total_price DECIMAL(10, 2),
        items_count INT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database tabela të krijuara/ekziston');
    client.release();
  } catch (err) {
    console.error('❌ Gabim në inicializimin e database:', err);
  }
}

// API Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by brand
app.get('/api/products/brand/:brand', async (req, res) => {
  try {
    const { brand } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE brand = $1 ORDER BY id',
      [brand]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      customer_city,
      customer_zip,
      payment_method,
      total_price,
      items_count
    } = req.body;

    const result = await pool.query(
      `INSERT INTO orders 
       (customer_name, customer_email, customer_phone, customer_address, 
        customer_city, customer_zip, payment_method, total_price, items_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        customer_city,
        customer_zip,
        payment_method,
        total_price,
        items_count
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Porosi e regjistruar me sukses!',
      order: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Error creating order:', err);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// Get all orders (admin)
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Endelus Shop API aktiv ✅' });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Serveri është aktiv në port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  initializeDB();
});

module.exports = app;
