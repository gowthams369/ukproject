import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
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
      default: "user",
      required: true,
    },
    isAdmitted: { type: Boolean, default: false },
    readyToWork: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false, required: true },
    assignedWork: {
      location: {
        type: String, 
        required: false,
      },
      userCoordinates: {
        latitude: { type: Number, required: false },
        longitude: { type: Number, required: false },
      },
      startedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Hash password before saving the user
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

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
