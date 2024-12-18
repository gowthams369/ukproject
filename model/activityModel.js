import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  workDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  nurseSignature: {
    type: String,
    default: null,
  },
  nurseName: {
    type: String,
    default: null,
  },
}, { timestamps: true });

export const Activity = mongoose.model('Activity', activitySchema);