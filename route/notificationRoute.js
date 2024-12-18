import express from 'express';
import { getNotifications } from '../controller/notificationController.js';
const notificationrouter = express.Router();

notificationrouter.get("/notifications/:userId", getNotifications);

export default notificationrouter;