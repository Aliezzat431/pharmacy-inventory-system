const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function initDb() {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Initializing database...');

    // Users table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      paymentPortName TEXT NOT NULL
    )
  `);

    // Products table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL,
      purchasePrice REAL NOT NULL,
      unitConversion REAL,
      isBaseUnit INTEGER DEFAULT 0,
      barcode TEXT NOT NULL,
      barcodes TEXT, -- JSON string array
      expiryDate TEXT NOT NULL,
      unitOptions TEXT, -- JSON string array
      isShortcoming INTEGER DEFAULT 0,
      company TEXT NOT NULL,
      details TEXT DEFAULT "",
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Companies table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

    // Settings table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL -- JSON stringified
    )
  `);

    // Winnings table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS winnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      reason TEXT,
      transactionType TEXT NOT NULL, -- in, suspended, out
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Debtors table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS debtors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      partialPayments REAL DEFAULT 0
    )
  `);

    // Orders table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debtorId INTEGER NOT NULL,
      total REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debtorId) REFERENCES debtors (id) ON DELETE CASCADE
    )
  `);

    // Order Items table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      total REAL NOT NULL,
      unitOptions TEXT, -- JSON string array
      fullProduct TEXT, -- JSON stringified
      FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE
    )
  `);

    // Checkout Items table
    await db.exec(`
    CREATE TABLE IF NOT EXISTS checkout_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      quantity REAL,
      unit TEXT,
      total REAL
    )
  `);

    console.log('Database initialized successfully.');
    await db.close();
}

initDb().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
