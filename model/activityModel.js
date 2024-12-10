import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    location: { type: String, default: "Unknown" },
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
      validate: {
        validator: (value) => !isNaN(Date.parse(value)),
        message: "Invalid start time.",
      },
    },
    endTime: {
      type: Date,
      validate: {
        validator: function (value) {
          return !this.startTime || value > this.startTime;
        },
        message: "End time must be after start time.",
      },
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

// Add indexes for optimization
activitySchema.index({ user: 1 });
activitySchema.index({ isActive: 1 });

export const Activity = mongoose.model("Activity", activitySchema);
