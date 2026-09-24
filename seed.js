const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedDatabase() {
  try {
    console.log('⏳ Duke u lidhur me database...');
    const client = await pool.connect();

    // Fshij të dhëna të vjetra
    console.log('🗑️ Duke fshirë të dhënat e vjetra...');
    await client.query('TRUNCATE TABLE products RESTART IDENTITY');

    // Lexo products.json
    const productsData = JSON.parse(fs.readFileSync('./products.json', 'utf8'));
    const products = productsData.products;

    console.log(`📦 Duke ngarkuar ${products.length} produkte...`);

    // Insert all products
    for (const product of products) {
      await client.query(
        `INSERT INTO products (id, brand, name, size, price, gender, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [product.id, product.brand, product.name, product.size, product.price, product.gender, product.image]
      );
    }

    console.log(`✅ ${products.length} produkte u ngarkuan me sukses!`);
    
    // Verify
    const result = await client.query('SELECT COUNT(*) FROM products');
    const count = result.rows[0].count;
    console.log(`📊 Gjithsej në database: ${count} produkte`);

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Gabim:', err.message);
    process.exit(1);
  }
}

seedDatabase();
