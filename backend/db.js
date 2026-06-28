const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const primaryMongoUri = process.env.MONGODB_URI;
const fallbackMongoUri = process.env.MONGODB_FALLBACK_URI || "mongodb://127.0.0.1:27017/myinvitationcard";

mongoose.set("strictQuery", false);

const connectionOptions = {
  dbName: process.env.MONGODB_DB || undefined,
  serverSelectionTimeoutMS: 30000,  // Increased from 10000ms to 30000ms
  socketTimeoutMS: 60000,           // Increased from 45000ms to 60000ms
  connectTimeoutMS: 30000,          // Increased from 10000ms to 30000ms
  maxPoolSize: 10,                  // Connection pool max size
  minPoolSize: 2,                   // Connection pool min size
  retryWrites: true,
  waitQueueTimeoutMS: 30000         // Timeout for waiting in queue
};

let isConnected = false;

mongoose.connection.on("connected", () => {
  isConnected = true;
  console.log("✅ MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  isConnected = false;
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("⚠️ MongoDB connection disconnected");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  console.log("✅ MongoDB reconnected");
});

async function connectMongo(uri) {
  return mongoose.connect(uri, connectionOptions);
}

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const primary = primaryMongoUri || fallbackMongoUri;
  try {
    console.log(`🔄 Connecting to MongoDB at ${primary.substring(0, 50)}...`);
    return await connectMongo(primary);
  } catch (primaryError) {
    if (primaryMongoUri && primaryMongoUri !== fallbackMongoUri) {
      console.warn("⚠️ Primary MongoDB URI failed. Falling back to local MongoDB.");
      try {
        console.log(`🔄 Connecting to fallback MongoDB at ${fallbackMongoUri}`);
        return await connectMongo(fallbackMongoUri);
      } catch (fallbackError) {
        console.error("❌ Fallback MongoDB connection failed:", fallbackError.message);
        throw primaryError;
      }
    }
    throw primaryError;
  }
}

function getConnectionStatus() {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    db: mongoose.connection.db ? mongoose.connection.db.getName() : null
  };
}

module.exports = {
  connectDB,
  mongoose,
  getConnectionStatus
};
