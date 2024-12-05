import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Define the user schema
const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dateOfBirth: { type: Date, required: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      default: "user", // Default role is 'user'
      required: true,
    },
    readyToWork: {
      type: Boolean,
    //   default: false, // Default is 'true' (user is ready to work)
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