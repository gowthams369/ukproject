import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Define the admin schema
const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      default: "admin",
      required: true,
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