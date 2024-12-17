import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
});

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    location: {
      type: locationSchema, // Use a sub-schema for latitude and longitude
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: false,
    },
    nurseSignature: {
      type: String, // Store signature as a string (base64 encoded image or a text signature)
      required: false,
    },
    nurseName: {
      type: String, // Nurse's name
      required: false,
    },
  },
  { timestamps: true }
);

export const Activity = mongoose.model("Activity", activitySchema);