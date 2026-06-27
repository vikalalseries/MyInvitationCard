const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const primaryMongoUri = process.env.MONGODB_URI;
const fallbackMongoUri = process.env.MONGODB_FALLBACK_URI || "mongodb://127.0.0.1:27017/myinvitationcard";

mongoose.set("strictQuery", false);

const connectionOptions = {
  dbName: process.env.MONGODB_DB || undefined,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000
};

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection disconnected");
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
    console.log(`Connecting to MongoDB at ${primary}`);
    return await connectMongo(primary);
  } catch (primaryError) {
    if (primaryMongoUri && primaryMongoUri !== fallbackMongoUri) {
      console.warn("Primary MongoDB URI failed. Falling back to local MongoDB.");
      try {
        console.log(`Connecting to fallback MongoDB at ${fallbackMongoUri}`);
        return await connectMongo(fallbackMongoUri);
      } catch (fallbackError) {
        console.error("Fallback MongoDB connection failed:", fallbackError);
        throw primaryError;
      }
    }
    throw primaryError;
  }
}

module.exports = {
  connectDB,
  mongoose
};
