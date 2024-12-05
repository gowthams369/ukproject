import {Activity} from "../model/activityModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import AppError from "../utils/error.util.js";

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
      message: `User activity set to ${activity.isActive ? "active" : "inactive"}`,
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
 * Admin assigns a location to an active user
 */
export const assignLocationToActiveUser = asyncHandler(async (req, res) => {
  const { activityId, location } = req.body;

  if (!activityId || !location) {
    return res.status(400).json({ message: "Activity ID and location are required." });
  }

  try {
    // Fetch the activity
    const activity = await Activity.findById(activityId).populate("user", "firstname lastname");

    if (!activity) {
      return res.status(404).json({ message: "Activity not found." });
    }

    // Ensure the user is active
    if (!activity.isActive) {
      return res.status(400).json({
        message: `User ${activity.user.firstname} ${activity.user.lastname} is not currently active.`,
      });
    }

    // Assign the location
    activity.location = location;
    activity.lastUpdated = Date.now(); // Update the timestamp
    await activity.save();

    res.status(200).json({
      success: true,
      message: `Location assigned successfully to ${activity.user.firstname} ${activity.user.lastname}.`,
      activity,
    });
  } catch (error) {
    console.error("Error assigning location:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


/**
 * User fetches their assigned work
 */
export const getUserAssignedWork = asyncHandler(async (req, res) => {
  const { userId } = req.body; // Get the user ID directly from the request body

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    // Fetch the activity assigned to the user
    const activity = await Activity.findOne({ user: userId, isActive: true })
      .populate("user", "firstname lastname email") // Populate the user fields
      .populate("location", "name address"); // Optionally, populate location details if needed

    if (!activity) {
      return res.status(404).json({ message: "No active work assigned to this user." });
    }

    res.status(200).json({
      success: true,
      message: "Assigned work fetched successfully.",
      activity,
    });
  } catch (error) {
    console.error("Error fetching assigned work:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * User starts work by swiping
 */
export const startWork = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    // Fetch the activity assigned to the user that is active
    const activity = await Activity.findOne({ user: userId, isActive: true });

    if (!activity) {
      return res.status(404).json({ message: "No active work assigned to this user." });
    }

    // Check if work is already started
    if (activity.startTime) {
      return res.status(400).json({ message: "Work has already started." });
    }

    // Set the start time
    activity.startTime = new Date();
    await activity.save();

    res.status(200).json({
      success: true,
      message: "Work started successfully.",
      startTime: activity.startTime,
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
 * Get total working days for a user
 */
export const getTotalWorkingDays = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    // Fetch all completed activities for the user
    const activities = await Activity.find({
      user: userId,
      isActive: false, // Completed activities
    });

    if (activities.length === 0) {
      return res.status(404).json({ message: "No completed work found for this user." });
    }

    // Extract unique working days
    const workingDays = new Set(
      activities.map((activity) =>
        new Date(activity.startTime).toISOString().split("T")[0] // Extract only the date part
      )
    );

    res.status(200).json({
      success: true,
      message: `Total working days: ${workingDays.size}`,
      totalWorkingDays: workingDays.size,
    });
  } catch (error) {
    console.error("Error calculating total working days:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});