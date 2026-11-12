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

    async getEventCategories(request, res) {
        return userModule.getEventCategories(request, res);
    },
};

export default userController;
