import { registerUser,loginUser,logoutUser,getTotalWorkingDaysWithDetails,getUserProfile,setUserActive, startWork,getUserSession} from "../controller/userController.js";
import express from "express"
const userroute=express.Router();

userroute.post("/userregister",registerUser);
userroute.post("/userlogin",loginUser);
userroute.post("/userlogout",logoutUser);
userroute.get("/:userId/getUserProfile",getUserProfile);
userroute.get("/:userId/getTotalWorkingDaysWithDetails",getTotalWorkingDaysWithDetails);
userroute.post("/setUserActive",setUserActive);
userroute.post("/startWork",startWork)
userroute.get("/getUserSession",getUserSession)






export default userroute;