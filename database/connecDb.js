import mongoose from "mongoose";

let mongod = null;

export const Connection = async () => {
  const uri = process.env.MONGO_URI;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowInMemory = (process.env.ALLOW_IN_MEMORY === 'true') || nodeEnv !== 'production';

  if (uri) {
    try {
      await mongoose.connect(uri, { keepAlive: true });
      console.log("✅ Connected to MongoDB:", uri);
      return;
    } catch (err) {
      console.error("❌ MongoDB Connection Error (env MONGO_URI):", err.message);
    }
  }

  if (!allowInMemory) {
    console.error(
      "❌ No MONGO_URI provided and in-memory MongoDB is disabled for this environment.\n" +
      "Set the environment variable MONGO_URI to a valid MongoDB connection string,\n" +
      "or set ALLOW_IN_MEMORY=true for non-production testing."
    );
    if (nodeEnv === 'production') throw new Error('Missing MONGO_URI in production');
    return;
  }

  // Dynamically import mongodb-memory-server only when needed (avoid native binary issues in prod)
  try {
    console.log("⚠️ Starting in-memory MongoDB (mongodb-memory-server) for development/testing...");
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri, { keepAlive: true });
    console.log("✅ Connected to in-memory MongoDB");
  } catch (memErr) {
    console.error("❌ In-memory MongoDB failed:", memErr && memErr.message ? memErr.message : memErr);
    console.error(
      "Suggestion: set `MONGO_URI` to a real MongoDB instance (Atlas, Railway addon),\n" +
      "or enable in-memory by setting ALLOW_IN_MEMORY=true in non-production environments.\n" +
      "If you are running inside a Linux container and see a missing library error (e.g. libcurl),\n" +
      "install the required system packages or avoid using mongodb-memory-server in that environment."
    );
    if (nodeEnv === 'production') throw memErr;
  }
};

export default Connection;
