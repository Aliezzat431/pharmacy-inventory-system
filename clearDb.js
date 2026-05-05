const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const MONGODB_URI_1 = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy-stock';
const MONGODB_URI_2 = process.env.MONGODB_URI_2 || 'mongodb://localhost:27017/pharmacy-stock-2';

async function dropDatabase(uri, pharmacyId) {
  console.log(`\n--- Attempting to clear database for Pharmacy ${pharmacyId} ---`);
  console.log(`URI: ${uri.replace(/:([^:@]{1,})@/, ':****@')}`); // Mask password in logs

  let connection;
  try {
    // Create a connection with a timeout
    connection = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).asPromise();

    console.log(`Connected successfully to Pharmacy ${pharmacyId} database.`);

    // Attempt to drop the entire database
    try {
      await connection.dropDatabase();
      console.log(`✅ Database for Pharmacy ${pharmacyId} dropped successfully.`);
    } catch (dropErr) {
      console.warn(`⚠️ Could not drop database for Pharmacy ${pharmacyId}, clearing collections instead.`);

      // Fallback: Clear all collections manually
      const collections = await connection.db.listCollections().toArray();
      if (collections.length === 0) {
        console.log(`ℹ️ No collections found to clear for Pharmacy ${pharmacyId}.`);
      } else {
        for (const col of collections) {
          await connection.db.collection(col.name).deleteMany({});
          console.log(`   - Cleared collection: ${col.name}`);
        }
        console.log(`✅ All collections for Pharmacy ${pharmacyId} cleared.`);
      }
    }
  } catch (err) {
    console.error(`❌ Failed to process Pharmacy ${pharmacyId} database:`, err.message);
  } finally {
    if (connection) {
      await connection.close();
      console.log(`Connection closed for Pharmacy ${pharmacyId}.`);
    }
  }
}

async function runCleanup() {
  console.log("🚀 Starting Database Cleanup Process...");

  // Process both databases sequentially to avoid race conditions or heavy load
  await dropDatabase(MONGODB_URI_1, "1");

  if (MONGODB_URI_2 && MONGODB_URI_2 !== MONGODB_URI_1) {
    await dropDatabase(MONGODB_URI_2, "2");
  } else {
    console.log("\nSkipping Pharmacy 2: URI not provided or identical to Pharmacy 1.");
  }

  console.log("\n✨ Database cleanup process finished.");
  process.exit(0);
}

runCleanup().catch(err => {
  console.error("💥 Fatal error during cleanup:", err);
  process.exit(1);
});
