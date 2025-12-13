import mongoose from "mongoose";
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

export const Connection = async () => {
  const uri = process.env.MONGO_URI;

  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log("✅ Connected to MongoDB:", uri);
      return;
    } catch (err) {
      console.error("❌ MongoDB Connection Error (env MONGO_URI):", err.message);
    }
  }

  // Fallback: in-memory MongoDB
  try {
    console.log("⚠️ Starting in-memory MongoDB (mongodb-memory-server)...");
    mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log("✅ Connected to in-memory MongoDB");
  } catch (memErr) {
    console.error("❌ In-memory MongoDB failed:", memErr.message);
  }
};

export default Connection;
