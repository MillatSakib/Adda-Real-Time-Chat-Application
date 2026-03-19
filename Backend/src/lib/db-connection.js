import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoURL = process.env.MONGODB_URL || "mongodb://localhost:27017";
  try {
    await mongoose.connect(mongoURL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
