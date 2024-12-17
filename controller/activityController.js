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
 * User starts work by swiping.
 */
export const startWork = asyncHandler(async (req, res) => {
  const { userId, userLatitude, userLongitude, startTime } = req.body;

  if (!userId || !userLatitude || !userLongitude) {
    return res
      .status(400)
      .json({ message: "User ID, user's current latitude, and longitude are required." });
  }

  try {
    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the user already has an active activity
    const activeActivity = await Activity.findOne({ user: userId, isActive: true });
    if (activeActivity) {
      // Deactivate the current activity
      activeActivity.isActive = false;
      activeActivity.endTime = new Date(); // Record end time
      await activeActivity.save();
    }

    // Check if an assigned location exists
    const assignedActivity = await Activity.findOne({ user: userId, isActive: false }).sort({
      createdAt: -1,
    });
    if (!assignedActivity || !assignedActivity.location) {
      return res
        .status(403)
        .json({ message: "No assigned location. Please contact the admin." });
    }

    const { latitude: assignedLatitude, longitude: assignedLongitude } = assignedActivity.location;

    // Validate user's proximity to assigned location
    const distance = calculateDistance(userLatitude, userLongitude, assignedLatitude, assignedLongitude);
    if (distance > 0.5) {
      return res.status(403).json({
        message: "You must be within 500m of the admin-assigned location to start work.",
        assignedLocation: assignedActivity.location,
        userDistanceFromAssigned: `${distance.toFixed(2)} km`,
      });
    }

    // Create a new activity for starting work
    const newActivity = new Activity({
      user: userId,
      location: assignedActivity.location,
      isActive: true,
      startTime: startTime ? new Date(startTime) : new Date(),
    });

    await newActivity.save();

    // Update user's current activity
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
    const activity = await Activity.findOne({ user: userId, isActive: true });

    if (!activity) {
      return res.status(404).json({ message: "No active work assigned to this user." });
    }

    const distance = calculateDistance(userLatitude, userLongitude, activity.latitude, activity.longitude);
    if (distance > 0.5) {
      return res
        .status(403)
        .json({ message: "You must be within 500m of the starting location to submit attendance." });
    }

    activity.endTime = new Date(endTime);
    activity.nurseSignature = nurseSignature;
    activity.nurseName = nurseName;
    activity.isActive = false;

    await activity.save();

    res.status(200).json({
      success: true,
      message: "Attendance submitted successfully.",
      data: {
        startTime: activity.startTime,
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