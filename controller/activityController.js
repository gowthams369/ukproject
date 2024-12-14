import {Activity} from "../model/activityModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import { User } from "../model/userModel.js";



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
  const { userId, location, startTime } = req.body;

  // Validate request body
  if (!userId || !location || !startTime) {
    return res.status(400).json({ message: "User ID, location, and start time are required." });
  }

  try {
    // Fetch the user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if an active activity already exists for the user
    const activity = await Activity.findOne({ user: userId, isActive: true });

    if (activity) {
      return res.status(400).json({ message: "An active activity already exists for this user." });
    }

    // Create and save a new activity with the provided start time
    const newActivity = await Activity.create({
      user: userId,
      location,
      isActive: true,
      startTime: new Date(startTime), // Ensure the provided startTime is parsed correctly
    });

    // Update the user's current activity field
    user.currentActivity = newActivity._id;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Work started successfully.",
      startTime: newActivity.startTime,
      location: newActivity.location,
    });
  } catch (error) {
    console.error("Error starting work:", error.message, error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * User swipes back and collects the nurse's signature (ends work)
 */
export const submitNurseSignature = asyncHandler(async (req, res) => {
  const { userId, nurseSignature, nurseName, endTime } = req.body;

  if (!userId || !nurseSignature || !nurseName || !endTime) {
    return res.status(400).json({ message: "User ID, nurse's signature, nurse's name, and end time are required." });
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
    activity.endTime = new Date(endTime);  // Manually set the provided end time
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
 * User: Get total working days with details and total working hours for the logged-in user
 */
export const getUserWorkingDaysWithDetails = asyncHandler(async (req, res) => {
  // Retrieve the user ID from the authenticated session or token
  const userId = req.user?.id; // Assuming `req.user` contains authenticated user info

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated." });
  }

  try {
    // Fetch all completed activities for the logged-in user
    const activities = await Activity.find({ user: userId, isActive: false }) // Only completed activities
      .select("startTime endTime location"); // Select relevant fields

    if (activities.length === 0) {
      return res.status(404).json({ message: "No completed work found for this user." });
    }

    // Initialize total working hours
    let totalWorkingHours = 0;

    // Group activities by date
    const workingDaysDetails = activities.reduce((result, activity) => {
      // Validate startTime and endTime
      const startDate = new Date(activity.startTime);
      const endDate = new Date(activity.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn("Invalid startTime or endTime for activity:", activity);
        return result; // Skip invalid activity
      }

      // Calculate working hours for this activity
      const workingDuration = (endDate - startDate) / (1000 * 60 * 60); // Convert milliseconds to hours
      totalWorkingHours += workingDuration;

      const date = startDate.toISOString().split("T")[0]; // Extract date
      const time = startDate.toISOString().split("T")[1]; // Extract time
      const location = activity.location || "Unknown"; // Default location if missing

      if (!result[date]) {
        result[date] = {
          totalWorkingTime: 0, // Initialize total working time for the date
          activities: [], // Array to store details of activities on this date
        };
      }

      // Add activity details to the date
      result[date].activities.push({ time, location, workingDuration });

      // Add workingDuration to total working time for the date
      result[date].totalWorkingTime += workingDuration;

      return result;
    }, {});

    // Format the response
    const formattedResponse = {
      userId,
      totalWorkingDays: Object.keys(workingDaysDetails).length,
      totalWorkingHours: formatTimeInHours(totalWorkingHours), // Format the total working hours to 2 decimal places
      workingDaysDetails: Object.entries(workingDaysDetails).map(([date, details]) => ({
        date,
        totalWorkingTime: details.totalWorkingTime, // Total working time for the date
        workingTimeFormatted: formatTimeInHours(details.totalWorkingTime), // Total working time in hours (formatted)
        activities: details.activities, // Activities for this date
      })),
    };

    res.status(200).json({
      success: true,
      message: "Working days and total working hours details retrieved successfully.",
      data: formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching working days for user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Helper function to format working time from hours
const formatTimeInHours = (totalHours) => {
  if (totalHours < 0) return "0.00"; // Ensure negative durations are not shown
  return totalHours.toFixed(2); // Limit to 2 decimal places
};
