import { Admin } from "../model/adminModel.js";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import bcrypt from "bcryptjs";
import AppError from "../utils/error.util.js";
import { User } from "../model/userModel.js";
import redis from "redis";
import { Activity } from "../model/activityModel.js";
/**
 * @ADMIN  - Registers a new admin ------------------------------------REGISTER------------------------------------------------
 */
export const register = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Email and password are required", 400));
  }

  const adminExists = await Admin.findOne({ email });
  if (adminExists) {
    return next(new AppError("Admin with this email already exists", 409));
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await Admin.create({ email, password: hashedPassword });

  if (!admin) {
    return next(
      new AppError("Admin registration failed. Please try again.", 400)
    );
  }

  res.status(201).json({
    success: true,
    message: "Admin registered successfully",
    admin: {
      id: admin._id,
      email: admin.email,
    },
  });
});

/**
 * @ADMIN  - Authenticates an admin------------------------------------LOGIN------------------------------------------------
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Email and password are required", 400));
  }

  const admin = await Admin.findOne({ email });
  console.log("Admin found:", admin);
  if (!admin) {
    console.log(`Admin not found for email: ${email}`);
    return next(new AppError("Invalid email or password", 401));
  }

  console.log("Stored password hash:", admin.password);
  console.log("Entered password:", password);

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  console.log("Password comparison result:", isPasswordValid);
  if (!isPasswordValid) {
    return next(new AppError("Invalid email or password", 401));
  }
  // Generate token after successful login
  const token = admin.generateAuthToken();

  res.status(200).json({
    success: true,
    message: "Admin logged in successfully",
    admin: {
      id: admin._id,
      email: admin.email,
    },
    token,
  });
});


/**
 * @ADMIN_GET_ALL_USERS ----------------------GET ALL USERS-----------------------
 * Allows an admin to retrieve all registered users.
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({}, { password: 0 }); 

  if (!users || users.length === 0) {
    return next(new AppError("No users found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Users fetched successfully",
    users,
  });
});


/**
 * @ADMIN_LOGOUT -----------------------ADMIN LOGOUT-----------------------
 * Logs out an admin by marking them as inactive (optional) or simply removing any session (if applicable).
 */
export const logoutAdmin = asyncHandler(async (req, res, next) => {
  const { adminId } = req.body;

  // Validate required fields
  if (!adminId) {
    return next(new AppError("Admin ID is required for logout", 400));
  }

  // Find the admin by ID
  const admin = await Admin.findById(adminId);
  if (!admin) {
    return next(new AppError("Admin not found", 404));
  }

  // Optionally, mark the admin as inactive (if you wish to track activity)
  admin.isActive = false; // Assuming you have an isActive field to track activity
  await admin.save();

  // Here we don't need to invalidate the JWT, as JWTs are stateless.
  // The admin will remain "logged in" until the JWT expires or is manually revoked.

  res.status(200).json({
    success: true,
    message: "Admin logged out successfully. Admin is now inactive.",
  });
});


// ------------------------user accept------------------------------------

export const admitUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  // Validate userId
  if (!userId) {
    return next(new AppError("User ID is required", 400));
  }

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Update admission status
  user.isAdmitted = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User admitted successfully.",
  });
});


/**
 * @ADMIN_GET_UNADMITTED_USERS ----------------GET UNADMITTED USERS---------------
 * Retrieves all users who are not admitted.
 */
export const getUnadmittedUsers = asyncHandler(async (req, res, next) => {
  try {
    // Find all users with isAdmitted set to false
    const unadmittedUsers = await User.find({ isAdmitted: false }, { password: 0 }); // Exclude password from the response

    // Handle no results found
    if (!unadmittedUsers || unadmittedUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No unadmitted users found",
      });
    }

    // Respond with unadmitted users
    res.status(200).json({
      success: true,
      message: "Unadmitted users fetched successfully",
      unadmittedUsers,
    });
  } catch (error) {
    // Handle server error
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching unadmitted users",
      error: error.message,
    });
  }
});


// -------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Admin assigns a location to an active user and also sets the work date.
 */
export const assignLocationToActiveUser = asyncHandler(async (req, res) => {
  const { userId, location, workDate } = req.body;

  if (!userId || !location || !workDate) {
    return res
      .status(400)
      .json({ message: "User ID, location, and work date are required." });
  }

  try {
    // Validate the work date format
    const assignedWorkDate = new Date(workDate);
    if (isNaN(assignedWorkDate.getTime())) {
      return res.status(400).json({ message: "Invalid work date format." });
    }

    // Ensure the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Fetch the current active activity for the user
    let activity = await Activity.findOne({ user: userId, isActive: true });

    // Deactivate the previous activity (if any)
    if (activity) {
      activity.isActive = false;
      await activity.save();
    }

    // Create a new activity with the manually assigned work date
    const newActivity = new Activity({
      user: userId,
      location,
      workDate: assignedWorkDate, // Manually assigned work date
      isActive: true,
      startTime: null, // Reset start time
      endTime: null, // Reset end time
      nurseSignature: null, // Reset nurse details
      nurseName: null, // Reset nurse details
    });

    await newActivity.save();

    res.status(201).json({
      success: true,
      message: "New activity assigned successfully with work date.",
      activity: newActivity,
    });
  } catch (error) {
    console.error("Error assigning new activity:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



// ------------------------attendance------------------
export const getAllUsersWorkingDaysWithDetails = async (req, res) => {
  try {
    // Fetch all completed activities
    const activities = await Activity.find({ isActive: false })
      .populate("user", "firstname lastname email")
      .select("user startTime location");

    if (activities.length === 0) {
      return res.status(404).json({ message: "No completed work found for any user." });
    }

    // Group activities by user and then by date
    const userWorkingDays = activities.reduce((result, activity) => {
      // Validate user
      if (!activity.user) {
        console.warn("Activity has no associated user:", activity);
        return result; // Skip this activity
      }

      // Validate startTime
      if (!activity.startTime || isNaN(new Date(activity.startTime).getTime())) {
        console.warn("Invalid startTime for activity:", activity);
        return result; // Skip invalid activity
      }

      const userId = activity.user._id;
      const date = new Date(activity.startTime).toISOString().split("T")[0]; // Extract date
      const time = new Date(activity.startTime).toISOString().split("T")[1]; // Extract time
      const location = activity.location;

      if (!result[userId]) {
        result[userId] = {
          userDetails: {
            id: userId,
            firstname: activity.user.firstname,
            lastname: activity.user.lastname,
            email: activity.user.email,
          },
          workingDays: {}, // Initialize an empty object to store working days
        };
      }

      if (!result[userId].workingDays[date]) {
        result[userId].workingDays[date] = {
          totalWorkingTime: 0, // Initialize total working time for the date
          activities: [], // Array to store details of activities on this date
        };
      }

      // Add current activity details to the date
      const activityDetails = {
        time,
        location,
      };

      result[userId].workingDays[date].activities.push(activityDetails);

      // Calculate total working time for the date (time format: HH:MM:SS)
      const [hours, minutes, seconds] = time.split(":");
      const totalTimeInSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
      result[userId].workingDays[date].totalWorkingTime += totalTimeInSeconds;

      return result;
    }, {});

    // Format the response
    const formattedResponse = Object.values(userWorkingDays).map((user) => ({
      userDetails: user.userDetails,
      totalWorkingDays: Object.keys(user.workingDays).length,
      workingDaysDetails: Object.entries(user.workingDays).map(([date, details]) => ({
        date,
        totalWorkingTime: details.totalWorkingTime, // In seconds
        workingTimeFormatted: formatTimeInHours(details.totalWorkingTime), // Formatted in hours
        activities: details.activities, // Activities for this date
      })),
    }));

    res.status(200).json({
      success: true,
      message: "Working days details retrieved successfully.",
      data: formattedResponse,
    });
  } catch (error) {
    console.error("Error fetching working days for all users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to format working time from seconds to hours
const formatTimeInHours = (totalSeconds) => {
  const hours = totalSeconds / 3600; // Convert seconds to hours
  return hours.toFixed(2); // Limit to 2 decimal places
};



const redisClient = redis.createClient();