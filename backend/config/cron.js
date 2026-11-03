import db from "./db.js";
import cron from "node-cron";

// Example: Run every 1 minutes
const startCronJobs = () => {

  cron.schedule("*/1  * * * *", async () => {
    console.log("Running OTP cleanup job...");

    try {
      // Example DB query
      await db.query(`
        DELETE FROM otp_codes
        WHERE expires_at < NOW()
      `);

    //   console.log("Expired OTPs deleted");
    } catch (error) {
      console.error("Cron error:", error);
    }
  });

};

export default startCronJobs;