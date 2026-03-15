import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is not set. Please provide a MongoDB connection string."
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log("Connected to MongoDB");
}

export { mongoose };
export * from "./models/index.js";
