import schedule from 'node-schedule';
import { Activity } from './model/activityModel.js'; // Import Activity model
import { User } from './model/userModel.js'; // Import User model
import Notification from './model/notificationModel.js'; // Import Notification model

// Schedule job to run every hour
schedule.scheduleJob('0 * * * *', async () => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Calculate 24 hours from now

    // Find activities scheduled within the next 24 hours
    const upcomingActivities = await Activity.find({
      workDate: { $gte: now, $lte: next24Hours },
      isActive: true,
    }).populate("user"); // Populate user to get user details

    for (const activity of upcomingActivities) {
      // Check if a notification already exists for this activity
      const existingNotification = await Notification.findOne({
        user: activity.user._id,
        activity: activity._id,
      });

      // If no existing notification, create a new one
      if (!existingNotification) {
        await Notification.create({
          user: activity.user._id,
          activity: activity._id,
          message: `Reminder: You have work scheduled on ${activity.workDate.toLocaleDateString()}.`,
        });
      }
    }

    console.log("Notification job executed successfully.");
  } catch (error) {
    console.error("Error in notification job:", error.message);
  }
});