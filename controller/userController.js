import bcrypt from "bcrypt";
import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import { User } from "../model/userModel.js";
import AppError from "../utils/error.util.js";

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
  })
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