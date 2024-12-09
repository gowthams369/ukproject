import { registerUser,loginUser,logoutUser} from "../controller/userController.js";
import express from "express"
const userroute=express.Router();

userroute.post("/userregister",registerUser);
userroute.post("/userlogin",loginUser);
userroute.post("/userlogout",logoutUser);






export default userroute;