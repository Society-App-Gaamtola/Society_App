import cron from "node-cron";
import db from "./db.js";
import constant from "./constant.js";
import common from "./common.js";

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

// Posts scheduled events whose publish time has come. Returns how many were posted
export const publishScheduledEvents = async () => {
    try {
        const [result] = await db.query(
            `UPDATE events SET status = ?, posted_at = publish_at
             WHERE status = ? AND publish_at <= NOW() AND is_deleted = 0`,
            [constant.EVENT_STATUS.POSTED, constant.EVENT_STATUS.SCHEDULED],
        );
        if (result.affectedRows > 0) {
            console.log(`[cron] ${result.affectedRows} scheduled event(s) posted`);
        }
        return result.affectedRows;
    } catch (error) {
        console.error("[cron] Publishing scheduled events failed:", error);
        return 0;
    }
};

const startCronJobs = () => {
    // Once on start, so a server that was off at midnight still cleans up
    deleteExpiredOtps();

    // Then every 24 hours (see OTP_CLEANUP_SCHEDULE)
    cron.schedule(constant.OTP_CLEANUP_SCHEDULE, deleteExpiredOtps);

    // Scheduled events go live and new content is announced: once on start, then every 24 hours
    // (see EVENT_PUBLISH_SCHEDULE)
    const publishAndNotify = async () => {
        await publishScheduledEvents();
        const sent = await common.notifyNewContent();
        if (sent > 0) console.log(`[cron] ${sent} new event / notice notification(s) sent`);
    };
    publishAndNotify();
    cron.schedule(constant.EVENT_PUBLISH_SCHEDULE, publishAndNotify);
};

export default startCronJobs;
