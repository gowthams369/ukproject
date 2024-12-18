import asyncHandler from "../middlewares/asyncHandler.middleware.js";
import Notification from "../model/notificationModel.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    // Fetch notifications and populate the 'activity' field to get related activity details
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'activity',  // Populating the 'activity' field
        select: 'workDate', // Select only the 'workDate' field from the Activity model
      });

    // Map through the notifications and include workDate in the response
    const responseNotifications = notifications.map(notification => ({
      _id: notification._id,
      user: notification.user,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      workDate: notification.activity ? notification.activity.workDate : null, // Include workDate
    }));

    res.status(200).json({ success: true, notifications: responseNotifications });
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});