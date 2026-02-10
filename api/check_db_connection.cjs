// Simple DB connectivity check: lists collections and their document counts
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

async function main() {
  // Accept Mongo URI from CLI arg or environment
  const cliUri = process.argv[2];
  const mongoUri = cliUri || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set. Provide it in api/.env, environment, or pass as first argument.');
    console.error('Example: node api/check_db_connection.cjs "mongodb+srv://user:pw@cluster.mongodb.net/dbname"');
    process.exit(2);
  }

  try {
    console.log('Connecting to MongoDB...');
    console.log('Using URI:', mongoUri.replace(/(:\/\/).*@/, '$1****@'));
    await mongoose.connect(mongoUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
    console.log('Connected. Database:', mongoose.connection.name || '(unknown)');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    if (!collections.length) {
      console.log('No collections found in database.');
    } else {
      console.log('Collections and counts:');
      for (const c of collections) {
        try {
          const count = await db.collection(c.name).countDocuments();
          console.log(`- ${c.name}: ${count}`);
        } catch (err) {
          console.log(`- ${c.name}: (error getting count)`, err.message);
        }
      }
    }

    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error('Failed to connect or list collections:');
    console.error(msg);

    // Helpful hints for common Atlas connection issues
    if (msg.includes('whitelist') || msg.includes('IP') || msg.includes('not authorized') || msg.includes('Server selection')) {
      console.error('\nHints:');
      console.error('- If using MongoDB Atlas, make sure your current machine IP is added under Network Access -> IP Access List.');
      console.error("- You can add your current IP or add 0.0.0.0/0 for testing (not recommended for production).");
      console.error('- Ensure the username/password in the URI are correct and any special characters are URL-encoded.');
      console.error('- If your URI uses SRV (mongodb+srv://), ensure your environment can resolve DNS for the SRV records.');
      console.error('- If behind a corporate proxy or firewall, try running from a network with direct outbound access.');
    }

    process.exit(1);
  }
}

main();
