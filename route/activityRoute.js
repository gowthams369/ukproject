// routes/activityRoutes.js
import express from "express";
import { setUserActive, getActiveUsers,assignLocationToActiveUser,getUserAssignedWork,startWork,submitNurseSignature,getTotalWorkingDays }from "../controller/activityController.js";

const activityroute = express.Router();

// Route to toggle user activity
activityroute.post("/setUserActive", setUserActive);

// Route to get all active users
activityroute.get("/getActiveUsers", getActiveUsers);
activityroute.post("/assignLocationToActiveUser",assignLocationToActiveUser );
activityroute.get("/:userId/getUserAssignedWork",getUserAssignedWork);
activityroute.get("/:userId/startWork",startWork);
activityroute.post("/submitNurseSignature",submitNurseSignature);
activityroute.get("/getTotalWorkingDays",getTotalWorkingDays);

export default activityroute;
