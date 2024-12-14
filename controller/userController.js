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
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return next(new AppError("Email and password are required", 400));
  }

  // Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Invalid email or password", 401));
  }

  if (!user.isAdmitted) {
    return next(new AppError("User has not been admitted by the admin", 403));
  }

  // Compare the provided password with the stored hashed password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return next(new AppError("Invalid email or password", 401));
  }

  // Generate a token for the authenticated user
  const token = user.generateAuthToken();

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    },
    token, // Return the JWT token
  });
});


/**
* @USER_LOGOUT -----------------------USER LOGOUT-----------------------
* Logs out a user by marking them unavailable for work.
*/
export const logoutUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  // Validate required fields
  if (!userId) {
    return next(new AppError("User ID is required for logout", 400));
  }

  // Find the user by ID
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Mark the user as unavailable for work
  user.readyToWork = false;
  await user.save();

  // Here we do not need to explicitly clear any session, 
  // as we are relying on JWT for authentication.

  res.status(200).json({
    success: true,
    message: "Logout successful. User is marked as unavailable for work.",
  });
});


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
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    },
});
});




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
    return res.status(200).json({ message: "No completed work found for this user." });
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
}