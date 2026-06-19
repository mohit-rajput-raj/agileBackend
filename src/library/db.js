import mongoose from "mongoose";

let cachedConnection = null;

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (!cachedConnection) {
      cachedConnection = mongoose.connect(process.env.MONGODB_URI);
    }

    await cachedConnection;
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    cachedConnection = null;
    throw error;
  }
};