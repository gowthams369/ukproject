import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import route from "./route/adminRoute.js";
import userroute from "./route/userRoute.js";
import activityroute from "./route/activityRoute.js";
import notificationrouter from "./route/notificationRoute.js";
import "./scheduler.js";
import cors from "cors";


dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGOURL = process.env.MONGO_URL;

// Configure session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key", // Use a strong secret from .env or a secure string
  resave: false, // Prevents resaving unchanged sessions
  saveUninitialized: false, // Prevents saving uninitialized sessions
  store: MongoStore.create({
    mongoUrl: MONGOURL, // Connect to your MongoDB database
    ttl: 14 * 24 * 60 * 60, // Session expiration in seconds (e.g., 14 days)
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expiration (e.g., 7 days)
    httpOnly: true, // Helps mitigate XSS attacks
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
  },
});

// Apply session middleware
app.use(sessionMiddleware);

// Connect to MongoDB
mongoose
  .connect(MONGOURL)
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.error("Database connection error:", error));

// Define routes
app.get("/", (req, res) => {
  res.send("Hello From database");
});

app.use("/api/admin", route);
app.use("/api/user", userroute);
app.use("/api/user", activityroute);
app.use("/api/admin", activityroute);
app.use("/api/user", notificationrouter);