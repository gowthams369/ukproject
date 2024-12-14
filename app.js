import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import route from "./route/adminRoute.js";
import userroute from "./route/userRoute.js";
import activityroute from "./route/activityRoute.js";
import cors from 'cors';



dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGOURL = process.env.MONGO_URL;

mongoose
  .connect(MONGOURL)
  .then(() => {
    console.log("database connected successfully");
    app.listen(PORT, () => {
      console.log(`server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.log(error));



app.get("/", (req, res) => {
  res.send("Hello From database");
});

app.use("/api/admin", route);
app.use("/api/user",userroute);
app.use("/api/user",activityroute);
app.use("/api/admin",activityroute);