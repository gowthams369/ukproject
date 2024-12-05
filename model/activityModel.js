import mongoose from "mongoose";


const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    location: { type: String, required: false },
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
      type: String,  // Store signature as a string (base64 encoded image or a text signature)
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