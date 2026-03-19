import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myroad'; // Default local; override with env

let cached: typeof mongoose | null = null;

async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached) {
    return cached;
  }

  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
    cached = conn;
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function getDb() {
  return connectToDatabase();
}

export default connectToDatabase;
