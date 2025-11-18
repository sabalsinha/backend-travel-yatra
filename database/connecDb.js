import mongoose from "mongoose";

const Connection = () => {
  mongoose
    .connect(
      "mongodb+srv://sabalsinha20:Nanoheal%40123@cluster0.zzdf5.mongodb.net/traveldb?retryWrites=true&w=majority&appName=Cluster0"
    )
    .then(() => {
      console.log("Database connected successfully");
    })
    .catch((err) => {
      console.error("MongoDB Connection Error:", err);
    });
};

export default Connection;
