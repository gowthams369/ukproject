import {Activity} from "../model/activityModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import { User } from "../model/userModel.js";

/**
 * User starts work by swiping
 */
export const startWork = asyncHandler(async (req, res) => {
  const { userId, location, startTime } = req.body;

  if (!userId || !location) {
    return res.status(400).json({ message: "User ID and location are required." });
  }

  try {
    // Fetch the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch the active activity assigned to the user
    const activity = await Activity.findOne({ user: userId, isActive: true });

    if (activity) {
      return res.status(400).json({ message: "An active activity already exists for this user." });
    }

    // Use the provided startTime or default to current time if not provided
    const activityStartTime = startTime ? new Date(startTime) : new Date();

    // Create a new activity for the user
    const newActivity = new Activity({
      user: userId,
      location,
      isActive: true,
      startTime: activityStartTime,
    });

    // Save the activity to the database
    await newActivity.save();

    // Update the user's current activity field to the new activity
    user.currentActivity = newActivity._id;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Work started successfully.",
      startTime: newActivity.startTime,
      location: newActivity.location,
    });
  } catch (error) {
    console.error("Error starting work:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


/**
 * User swipes back and collects the nurse's signature (ends work)
 */
export const submitNurseSignature = async (req, res) => {
  try {
    const { userId, nurseSignature, nurseName, endTime } = req.body;

    // Validate required fields
    if (!userId || !nurseSignature || !nurseName || !endTime) {
      return res.status(400).json({ message: "User ID, nurse's signature, nurse's name, and end time are required." });
    }

    // Fetch the activity assigned to the user that is active
    const activity = await Activity.findOne({ user: userId, isActive: true });

    if (!activity) {
      return res.status(404).json({ message: "No active work assigned to this user." });
    }

    // Check if work is already completed (end time is set)
    if (activity.endTime) {
      return res.status(400).json({ message: "Work has already been completed." });
    }

    // Set the end time, nurse's signature, and nurse's name
    activity.endTime = new Date(endTime); // Manually set the provided end time
    activity.nurseSignature = nurseSignature; // Save the nurse's signature
    activity.nurseName = nurseName; // Save the nurse's name
    activity.isActive = false; // Mark the activity as inactive (work is completed)
    await activity.save();

    res.status(200).json({
      success: true,
      message: "Work completed successfully with nurse's signature.",
      data: {
        startTime: activity.startTime,
        endTime: activity.endTime,
        nurseSignature: activity.nurseSignature,
        nurseName: activity.nurseName,
      },
    });
  } catch (error) {
    console.error("Error submitting nurse signature:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};