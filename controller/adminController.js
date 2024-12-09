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
  const users = await User.find({}, { password: 0 }); // Exclude password from the response

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
 * Admin: Get total working days with details for all users
 */
export const getAllUsersWorkingDaysWithDetails = asyncHandler(async (req, res) => {
  try {
    // Fetch all completed activities
    const activities = await Activity.find({ isActive: false }) // Only completed activities
      .populate("user", "firstname lastname email") // Populate user details
      .select("user startTime location"); // Select relevant fields

    if (activities.length === 0) {
      return res.status(404).json({ message: "No completed work found for any user." });
    }

    // Group activities by user and then by date
    const userWorkingDays = activities.reduce((result, activity) => {
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
          workingDays: {},
        };
      }

      if (!result[userId].workingDays[date]) {
        result[userId].workingDays[date] = [];
      }

      result[userId].workingDays[date].push({ time, location });

      return result;
    }, {});

    // Format the response
    const formattedResponse = Object.values(userWorkingDays).map((user) => ({
      userDetails: user.userDetails,
      totalWorkingDays: Object.keys(user.workingDays).length,
      workingDaysDetails: Object.entries(user.workingDays).map(([date, details]) => ({
        date,
        details,
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
});


const redisClient = redis.createClient();