import userModule from "../module/userModule.js";

const userController = {
    async getHome(request, res) {
        return userModule.getHome(request, res);
    },

    async getEvents(request, res) {
        return userModule.getEvents(request, res);
    },

    async getEventDetails(request, res) {
        return userModule.getEventDetails(request, res);
    },

    async getNotices(request, res) {
        return userModule.getNotices(request, res);
    },

    async getNoticeDetails(request, res) {
        return userModule.getNoticeDetails(request, res);
    },

    async getMedia(request, res) {
        return userModule.getMedia(request, res);
    },

    async saveMedia(request, res) {
        return userModule.saveMedia(request, res);
    },

    async getMediaDetails(request, res) {
        return userModule.getMediaDetails(request, res);
    },

    async editMedia(request, res) {
        return userModule.editMedia(request, res);
    },

    async deleteMedia(request, res) {
        return userModule.deleteMedia(request, res);
    },

    async getNotifications(request, res) {
        return userModule.getNotifications(request, res);
    },

    async readNotification(request, res) {
        return userModule.readNotification(request, res);
    },

    async readAllNotifications(request, res) {
        return userModule.readAllNotifications(request, res);
    },

    async getMembers(request, res) {
        return userModule.getMembers(request, res);
    },

    async getNotificationSettings(request, res) {
        return userModule.getNotificationSettings(request, res);
    },
    async saveNotificationSettings(request, res) {
        return userModule.saveNotificationSettings(request, res);
    },
    async getAppInfo(request, res) {
        return userModule.getAppInfo(request, res);
    },

    async getDonationSettings(request, res) {
        return userModule.getDonationSettings(request, res);
    },

    async getMyDonations(request, res) {
        return userModule.getMyDonations(request, res);
    },

    async createDonation(request, res) {
        return userModule.createDonation(request, res);
    },

    async getExecutiveRequest(request, res) {
        return userModule.getExecutiveRequest(request, res);
    },

    async createExecutiveRequest(request, res) {
        return userModule.createExecutiveRequest(request, res);
    },

    async getEventCategories(request, res) {
        return userModule.getEventCategories(request, res);
    },
};

export default userController;
