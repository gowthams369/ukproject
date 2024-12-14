import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    location: { 
      type: String, 
      default: "Unknown" 
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
      required: [true, "Start time is required"], // Ensure startTime is required
      set: (value) => new Date(value), // Convert to Date object
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"], // Ensure endTime is required
      validate: {
        validator: function (value) {
          // If endTime is provided, check if it's after startTime
          if (this.startTime) {
            return value > this.startTime;
          }
          return true;
        },
        message: "End time must be after start time.",
      },
      set: (value) => new Date(value), // Convert to Date object
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
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Add indexes for optimization
activitySchema.index({ user: 1 });
activitySchema.index({ isActive: 1 });

export const Activity = mongoose.model("Activity", activitySchema);
