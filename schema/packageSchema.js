import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    // Full price range (optional but recommended)
    priceMin: {
      type: Number,
      required: true
    },
    priceMax: {
      type: Number,
      required: true
    },

    // For simple UI use
    duration: {
      type: String, // e.g., "5–7 Days"
      required: true
    },

    // Single image (main)
    imageUrl: {
      type: String,
      required: true
    },

    // Matching your tab-based UI
    location: {
      type: String,
      required: true,
      trim: true
    },


    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { versionKey: false }
);

const Package = mongoose.model("Package", packageSchema);

export default Package;
