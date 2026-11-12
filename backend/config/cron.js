import cron from "node-cron";
import db from "./db.js";
import constant from "./constant.js";

// Deletes every OTP whose expiry time has passed. Returns how many were removed
export const deleteExpiredOtps = async () => {
    try {
        const [result] = await db.query("DELETE FROM otp_codes WHERE expires_at < NOW()");
        console.log(`[cron] OTP cleanup: ${result.affectedRows} expired OTP(s) deleted`);
        return result.affectedRows;
    } catch (error) {
        console.error("[cron] OTP cleanup failed:", error);
        return 0;
    }
};

const startCronJobs = () => {
    // Once on start, so a server that was off at midnight still cleans up
    deleteExpiredOtps();

    // Then every 24 hours (see OTP_CLEANUP_SCHEDULE)
    cron.schedule(constant.OTP_CLEANUP_SCHEDULE, deleteExpiredOtps);
};

export default startCronJobs;
