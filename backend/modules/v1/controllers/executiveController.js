import executiveModule from "../module/executiveModule.js";

const executiveController = {
    async createEvent(request, res) {
        return executiveModule.createEvent(request, res);
    },

    async updateEvent(request, res) {
        return executiveModule.updateEvent(request, res);
    },

    async deleteEvent(request, res) {
        return executiveModule.deleteEvent(request, res);
    },


    async createNotice(request, res) {
        return executiveModule.createNotice(request, res);
    },

    async updateNotice(request, res) {
        return executiveModule.updateNotice(request, res);
    },

    async deleteNotice(request, res) {
        return executiveModule.deleteNotice(request, res);
    },

    async getEventPlans(request, res) {
        return executiveModule.getEventPlans(request, res);
    },

    async saveEventPlan(request, res) {
        return executiveModule.saveEventPlan(request, res);
    },

    async deleteEventPlan(request, res) {
        return executiveModule.deleteEventPlan(request, res);
    },

    async setEventStatus(request, res) {
        return executiveModule.setEventStatus(request, res);
    },

    async setEventFeatured(request, res) {
        return executiveModule.setEventFeatured(request, res);
    },

    async setNoticeStatus(request, res) {
        return executiveModule.setNoticeStatus(request, res);
    },

    async reviewMedia(request, res) {
        return executiveModule.reviewMedia(request, res);
    },

    async setMemberRole(request, res) {
        return executiveModule.setMemberRole(request, res);
    },

    async getExecutiveRequests(request, res) {
        return executiveModule.getExecutiveRequests(request, res);
    },

    async reviewExecutiveRequest(request, res) {
        return executiveModule.reviewExecutiveRequest(request, res);
    },
};

export default executiveController;
