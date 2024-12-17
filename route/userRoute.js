import { registerUser,loginUser,logoutUser,getTotalWorkingDaysWithDetails,getUserProfile,setUserActive} from "../controller/userController.js";
import express from "express"
const userroute=express.Router();

userroute.post("/userregister",registerUser);
userroute.post("/userlogin",loginUser);
userroute.post("/userlogout",logoutUser);
userroute.get("/:userId/getUserProfile",getUserProfile);
userroute.get("/:userId/getTotalWorkingDaysWithDetails",getTotalWorkingDaysWithDetails);
userroute.post("/setUserActive",setUserActive);






export default userroute;