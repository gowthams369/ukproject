import { Activity } from "../model/activityModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import { User } from "../model/userModel.js";

/**
 * Haversine formula to calculate the distance between two points on Earth.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180; // Converts degrees to radians
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in kilometers
};



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
 * User submits attendance with nurse's signature.
 */
export const submitNurseSignature = asyncHandler(async (req, res) => {
  const { userId, nurseSignature, nurseName, endTime, userLatitude, userLongitude } = req.body;

  if (!userId || !nurseSignature || !nurseName || !endTime || !userLatitude || !userLongitude) {
    return res.status(400).json({
      message: "User ID, nurse's signature, nurse's name, end time, and user's current location are required.",
    });
  }

  try {
    // Fetch the active activity for the user
    const activity = await Activity.findOne({ user: userId, isActive: true });

    if (!activity) {
      return res.status(404).json({ message: "No active work assigned to this user." });
    }

    // Ensure the start time is set. If it's still null, set it to the current time.
    if (!activity.startTime) {
      activity.startTime = new Date(); // Set the start time if it's missing
    }

    const distance = calculateDistance(userLatitude, userLongitude, activity.latitude, activity.longitude);
    if (distance > 0.5) {
      return res
        .status(403)
        .json({ message: "You must be within 500m of the starting location to submit attendance." });
    }

    // Set end time and other details
    activity.endTime = new Date(endTime);
    activity.nurseSignature = nurseSignature;
    activity.nurseName = nurseName;
    activity.isActive = false;

    // Mark the user as not ready to work
    const user = await User.findById(userId);
    if (user) {
      user.readyToWork = false;
      user.isActive = false;
      await user.save();
    }

    await activity.save();

    res.status(200).json({
      success: true,
      message: "Attendance submitted successfully.",
      data: {
        startTime: activity.startTime, // Ensure start time is correctly included
        endTime: activity.endTime,
        nurseSignature: activity.nurseSignature,
        nurseName: activity.nurseName,
      },
    });
  } catch (error) {
    console.error("Error submitting attendance:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});