import express from "express";
import {
  register,
  login,
  getAllUsers,
  logoutAdmin
} from "../controller/adminController.js";

const route = express.Router();

route.post("/register", register);
route.post("/login", login);
route.get("/getAllUsers",getAllUsers);
route.post("/logout",logoutAdmin);

export default route;