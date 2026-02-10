// api/testDbConnection.ts
import 'dotenv/config'; // Load environment variables from .env
import { connectToDatabase } from './_utils/mysqlConnect.js';

async function testConnection() {
  try {
    const { sequelize } = await connectToDatabase();
    console.log('Successfully connected to MySQL database from Node.js API.');
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Failed to connect to MySQL database from Node.js API:', error);
  }
}

testConnection();
