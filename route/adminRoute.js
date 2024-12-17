import express from "express";
import {
  register,
  login,
  getAllUsers,
  logoutAdmin,
  admitUser,
  getUnadmittedUsers,
  getAllUsersWorkingDaysWithDetails,
  assignLocationToActiveUser
} from "../controller/adminController.js";

const route = express.Router();

route.post("/register", register);
route.post("/login", login);
route.get("/getAllUsers",getAllUsers);
route.post("/logout",logoutAdmin);
route.post("/admitUser",admitUser);
route.get('/getUnadmittedUsers', getUnadmittedUsers);
route.get("/getAllUsersWorkingDaysWithDetails",getAllUsersWorkingDaysWithDetails);
route.post("/assignLocationToActiveUser",assignLocationToActiveUser);


export default route;