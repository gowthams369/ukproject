import {Activity} from "../model/activityModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import {User} from "../model/userModel.js";

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
 * Admin assigns a location to an active user or creates a new activity for the next day
 */
export const assignLocationToActiveUser = asyncHandler(async (req, res) => {
  const { userId, location } = req.body;

  if (!userId || !location) {
    return res.status(400).json({ message: "User ID and location are required." });
  }

  try {
    // Ensure the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch the current active activity for the user
    let activity = await Activity.findOne({ user: userId, isActive: true });

    // Check if the activity exists and belongs to today
    const today = new Date().setHours(0, 0, 0, 0); // Start of today
    if (activity && new Date(activity.startTime).setHours(0, 0, 0, 0) === today) {
      return res.status(400).json({ message: "The user already has an active task for today." });
    }

    // Deactivate the previous activity (if any)
    if (activity) {
      activity.isActive = false;
      await activity.save();
    }

    // Create a new activity for today
    const newActivity = new Activity({
      user: userId,
      location,
      isActive: true,
      startTime: null, // Reset start time
      endTime: null, // Reset end time
      nurseSignature: null, // Reset nurse details
      nurseName: null, // Reset nurse details
    });

    await newActivity.save();

    res.status(201).json({
      success: true,
      message: "New activity assigned successfully.",
      activity: newActivity,
    });
  } catch (error) {
    console.error("Error assigning new activity:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * User fetches their assigned work
 */
export const getUserAssignedWork = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    // Fetch the activity assigned to the user
    const activity = await Activity.findOne({ user: userId, isActive: true })
      .populate("user", "firstname lastname email")
      .populate("location", "name address");

    if (!activity) {
      return res.status(404).json({ message: "No active work assigned to this user." });
    }

    res.status(200).json({
      success: true,
      message: "Assigned work fetched successfully.",
      activity: {
        ...activity.toObject(),
        startTime: activity.startTime ? activity.startTime : null, // Show start time if available
      },
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
 * Get total working days with details for a user
 */
export const getTotalWorkingDaysWithDetails = asyncHandler(async (req, res) => {
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

    // Group activities by date
    const workingDaysDetails = activities.reduce((details, activity) => {
      const date = new Date(activity.startTime).toISOString().split("T")[0]; // Extract only the date part
      const time = new Date(activity.startTime).toISOString().split("T")[1]; // Extract time
      const location = activity.location ; // Add location if available

      if (!details[date]) {
        details[date] = [];
      }

      details[date].push({
        time,
        location,
      });

      return details;
    }, {});

    // Format the response
    const response = {
      success: true,
      message:`Total working days: ${Object.keys(workingDaysDetails).length}`,
      totalWorkingDays: Object.keys(workingDaysDetails).length,
      workingDaysDetails: Object.entries(workingDaysDetails).map(([date, details]) => ({
        date,
        details,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error calculating total working days:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});