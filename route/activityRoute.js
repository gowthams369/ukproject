// routes/activityRoutes.js
import express from "express";
import {  
    getActiveUsers,
    startWork,
    submitNurseSignature,
    getUserWorkingDaysWithDetails,
 }from "../controller/activityController.js";

const activityroute = express.Router();

// Route to toggle user activity
activityroute.get("/getActiveUsers", getActiveUsers);
activityroute.post("/startWork",startWork);
activityroute.post("/submitNurseSignature",submitNurseSignature);
activityroute.post("/getUserWorkingDaysWithDetails",getUserWorkingDaysWithDetails);

export default activityroute;
