import {Activity} from "../model/activityModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import { User } from "../model/userModel.js";


export const setUserActive = async (req, res) => {
  const { userId } = req.body;

  try {
    // Check for an existing activity document
    let activity = await Activity.findOne({ user: userId });

    if (activity) {
      // Toggle the activity status
      activity.isActive = !activity.isActive;
      activity.lastUpdated = Date.now();
    } else {
      // Create a new activity document if none exists
      activity = new Activity({
        user: userId,
        isActive: true, // Default to active for new entries
        lastUpdated: Date.now(),
      });
    }

    await activity.save();

    // Respond once after successful save
    res.status(200).json({
      success: true,
      message:`User activity set to ${activity.isActive ? "active" : "inactive"}`,
      activity,
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc Get all active users
// @route GET /api/activity/active
// @access Public
export const getActiveUsers = asyncHandler(async (req, res) => {
  const activeUsers = await Activity.find({ isActive: true }).populate(
    "user",
    "firstname lastname email role"
  );

  res.status(200).json({
    success: true,
    activeUsers,
  });
});


/**
 * User starts work by swiping
 */
export const startWork = asyncHandler(async (req, res) => {
  const { userId, location } = req.body;

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

    // Create a new activity for the user
    const newActivity = new Activity({
      user: userId,
      location,
      isActive: true,
      startTime: new Date(),
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
export const submitNurseSignature = asyncHandler(async (req, res) => {
  const { userId, nurseSignature, nurseName } = req.body;

  if (!userId || !nurseSignature || !nurseName) {
    return res.status(400).json({ message: "User ID, nurse's signature, and nurse's name are required." });
  }

  try {
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
    activity.endTime = new Date();
    activity.nurseSignature = nurseSignature; // Save the nurse's signature
    activity.nurseName = nurseName; // Save the nurse's name
    activity.isActive = false; // Mark the activity as inactive (work is completed)
    await activity.save();

    res.status(200).json({
      success: true,
      message: "Work completed successfully with nurse's signature.",
      startTime: activity.startTime,
      endTime: activity.endTime,
      nurseSignature: activity.nurseSignature,
      nurseName: activity.nurseName,
    });
  } catch (error) {
    console.error("Error submitting nurse signature:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});





/**
 * User: Get total working days with details for a specified user
 */
export const getUserWorkingDaysWithDetails = asyncHandler(async (req, res) => {
  const { userId } = req.body; // User ID passed in the request body

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    // Fetch all completed activities for the user
    const activities = await Activity.find({ user: userId, isActive: false }) // Only completed activities
      .select("startTime location"); // Select relevant fields

    if (activities.length === 0) {
      return res.status(404).json({ message: "No completed work found for this user." });
    }

    // Group activities by date
    const workingDaysDetails = activities.reduce((result, activity) => {
      // Validate startTime
      if (!activity.startTime || isNaN(new Date(activity.startTime).getTime())) {
        console.warn("Invalid startTime for activity:", activity);
        return result; // Skip invalid activity
      }

      const date = new Date(activity.startTime).toISOString().split("T")[0]; // Extract date
      const time = new Date(activity.startTime).toISOString().split("T")[1]; // Extract time
      const location = activity.location || "Unknown"; // Default location if missing

      if (!result[date]) {
        result[date] = [];
      }

      result[date].push({ time, location });

      return result;
    }, {});

    // Format the response
    const formattedResponse = {
      userId,
      totalWorkingDays: Object.keys(workingDaysDetails).length,
      workingDaysDetails: Object.entries(workingDaysDetails).map(([date, details]) => ({
        date,
        details,
      })),
    };

    res.status(200).json({
      success: true,
      message: "Working days details retrieved successfully.",
      data: formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching working days for user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});