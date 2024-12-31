import bcrypt from "bcryptjs";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import { User } from "../model/userModel.js";
import AppError from "../utils/error.util.js";
import { Activity } from "../model/activityModel.js";

/**
 * @REGISTER_USER -----------------------REGISTER NEW USER-----------------------
 * Registers a new user by creating a record in the database.
 */
export const registerUser = asyncHandler(async (req, res, next) => {
  const { firstname, lastname, email, dateOfBirth, phoneNumber, password } = req.body;

  // Validate required fields
  if (!firstname || !lastname || !email || !dateOfBirth || !phoneNumber || !password) {
    return next(new AppError("All fields are required", 400));
  }

  // Check if the email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email is already registered", 400));
  }

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const user = new User({
    firstname,
    lastname,
    email,
    dateOfBirth,
    phoneNumber,
    password: hashedPassword,
    isAdmitted: false,
  });

  // Save the user to the database
  await user.save();

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    },
  });
});

/**
* @USER_LOGIN -----------------------USER LOGIN-----------------------
* Authenticates a user and generates a JWT token.
*/
export const loginUser = async (req, res) => {
const { email, password } = req.body;

try {
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Store user data in the session
  req.session.userId = user._id;
  req.session.readyToWork = user.readyToWork;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: {
      id: user._id,
      email: user.email,
      isActive: user.isActive,
      readyToWork: user.readyToWork,
    },
  });
} catch (error) {
  res.status(500).json({ success: false, message: error.message });
}
};
/**
 * @USER_LOGOUT -----------------------USER LOGOUT-----------------------
 * Logs out a user by marking them unavailable for work.
 */
export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to log out' });
    }

    res.clearCookie('connect.sid'); // Clear the session cookie
    res.status(200).json({ success: true, message: 'Logout successful' });
  });
};


/**
* @USER_PROFILE -----------------------USER PROFILE-----------------------
* Fetches and returns the profile of the logged-in user.
*/
export const getUserProfile = asyncHandler(async (req, res, next) => {
const { userId } = req.params;

// Validate required field
if (!userId) {
    return next(new AppError("User ID is required", 400));
}

// Find the user by ID
const user = await User.findById(userId).select("-password -isAdmitted"); // Exclude sensitive fields
if (!user) {
    return next(new AppError("User not found", 404));
}

// Respond with the user's profile
res.status(200).json({
    success: true,
    message: "User profile retrieved successfully",
    user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    },
});
});





// ----------------------------------------------------------------------------------------------------------------------------------------------------
export const setUserActive = async (req, res) => {
const { userId, readyToWork } = req.body;

try {
  // Check if the user exists
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Update the user's active status and readiness to work
  user.isActive = !user.isActive; // Toggle the isActive status

  // Update readyToWork: Set as single value (true/false)
  if (readyToWork !== undefined) {
    user.readyToWork = readyToWork; // Ensure it is a boolean value
  }

  await user.save();

  // Respond after successfully updating the user
  res.status(200).json({
    success: true,
    message: `User is now ${user.isActive ? "active" : "inactive"}`,
    user,
  });
} catch (error) {
  // Handle errors
  res.status(500).json({ success: false, message: error.message });
  }
};


/**
* Get total working days with total time details for a user
*/
export const getTotalWorkingDaysWithDetails = async (req, res) => {
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

  // Group activities by date and calculate total time
  const workingDaysDetails = activities.reduce((details, activity) => {
    const date = new Date(activity.startTime).toISOString().split("T")[0]; // Extract only the date part
    const location = activity.location; // Add location if available

    if (!details[date]) {
      details[date] = {
        totalWorkingTime: 0, // Initialize total working time for the day in seconds
        activities: [],
      };
    }

    // Calculate working time for the activity (in seconds)
    const startTime = new Date(activity.startTime);
    const endTime = new Date(activity.endTime);
    const workingTimeInSeconds = (endTime - startTime) / 1000; // Convert milliseconds to seconds

    // Add activity details and accumulate total working time
    details[date].activities.push({
      startTime: activity.startTime,
      endTime: activity.endTime,
      location,
      workingTime: formatTimeInHours(workingTimeInSeconds), // Format working time in hours
    });

    details[date].totalWorkingTime += workingTimeInSeconds;

    return details;
  }, {});

  // Format the response
  const response = {
    success: true,
    message: `Total working days: ${Object.keys(workingDaysDetails).length}`,
    totalWorkingDays: Object.keys(workingDaysDetails).length,
    workingDaysDetails: Object.entries(workingDaysDetails).map(([date, details]) => ({
      date,
      totalWorkingTime: formatTimeInHours(details.totalWorkingTime), // Format total working time in hours
      activities: details.activities,
    })),
  };

  res.status(200).json(response);
} catch (error) {
  console.error("Error calculating total working days:", error);
  res.status(500).json({ message: "Server error", error: error.message });
}
};

// Helper function to format working time from seconds to hours
const formatTimeInHours = (totalSeconds) => {
const hours = totalSeconds / 3600; // Convert seconds to hours
return hours.toFixed(2); // Limit to 2 decimal places
};


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
  // Fetch user details from the database
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Get the assigned work details
  const { assignedWork } = user;
  const { startedAt, location } = assignedWork || {};

  // If a task has already started, reset it before assigning a new one
  if (startedAt) {
    // Mark the previous work as completed (if any)
    user.assignedWork.startedAt = null; // Reset the start time
    user.assignedWork.userCoordinates = null; // Reset coordinates

    // Optionally, you can set additional flags here like 'readyToWork' or 'isActive' to false
    user.readyToWork = false; // Set to false when starting new work
    user.isActive = false; // Mark as inactive if needed
  }

  // Prepare the user's current location (latitude and longitude)
  const currentLocation = {
    latitude: userLatitude, // From the request body
    longitude: userLongitude, // From the request body
  };

  // Set the start time (use provided time or default to the current time)
  const startTimeStamp = startTime ? new Date(startTime) : new Date();

  // Ensure startTimeStamp is valid
  if (isNaN(startTimeStamp.getTime())) {
    return res.status(400).json({ message: "Invalid start time provided." });
  }

  // Assign new work
  user.assignedWork = {
    location: location || 'New Location', // Update the location for the new task
    userCoordinates: currentLocation, // Update the user's current coordinates
    startedAt: startTimeStamp, // Set the start time for the new work
  };

  // Mark user as ready to work
  user.readyToWork = true;
  user.isActive = true;

  // Save the updated user object with the new work details
  await user.save();

  // Send success response with the start time, location, and coordinates
  res.status(200).json({
    success: true,
    message: "Work started successfully.",
    startTime: user.assignedWork.startedAt,
    location: user.assignedWork.location, // The location for the new task
    userCoordinates: currentLocation, // The user's current coordinates
  });
} catch (error) {
  console.error("Error starting work:", error);
  res.status(500).json({ message: "Server error", error: error.message });
}
});




export const getUserSession = async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        isActive: user.isActive,
        readyToWork: req.session.readyToWork, // From session
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};