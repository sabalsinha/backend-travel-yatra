import mongoose from "mongoose";

const Connection = () => {
  mongoose
    .connect(
      process.env.MONGO_URI
    )
    .then(() => {
      console.log("Database connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB Connection Error:", err);
    });
};

export default Connection;
