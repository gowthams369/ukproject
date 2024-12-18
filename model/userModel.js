// Define the user schema
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Define the user schema
const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Ensures each email is unique
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    dateOfBirth: { type: Date, required: true },
    phoneNumber: { type: String, required: true },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      default: "user", // Default role is 'user'
      required: true,
    },
    isAdmitted: { type: Boolean, default: false },
    readyToWork: [
      {
        type: Boolean,
      },
    ],
    isActive: { 
      type: Boolean, 
      default: false, // Default to inactive when a user is created
      required: true 
    },
    assignedWork: {
      location: {
        type: String, // Location name assigned by admin
        required: false, // Optional location name
      },
      userCoordinates: { // User's current coordinates when they start work
        type: {
          latitude: { type: Number, required: false },
          longitude: { type: Number, required: false },
        },
        required: false,
      },
      startedAt: {
        type: Date,
        default: null, // Time when the user starts the work
      },
    },
  },
  { timestamps: true }
);

// Method to generate a JSON Web Token (JWT) for the user
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    role: this.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Export the User model
export const User = mongoose.model("User", userSchema);