import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Define the admin schema
const adminSchema = new mongoose.Schema(
  {
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
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      default: "admin",
      required: true,
    },
    location: {
      type: String,
      default: null, // Admin location is optional
    },
  },
  { timestamps: true }
);

// Method to generate a JSON Web Token (JWT) for the admin
adminSchema.methods.generateAuthToken = function () {
  // Create payload containing admin's ID and role
  const payload = {
    id: this._id,
    role: this.role,
  };

  // Sign the token with the secret key and set an expiration time (e.g., 7 days)
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

  return token;
};

// Create and export the Admin model based on the schema
export const Admin = mongoose.model("Admin", adminSchema);