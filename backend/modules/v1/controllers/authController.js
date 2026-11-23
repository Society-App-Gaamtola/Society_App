import authModule from "../module/authModule.js";

const authController = {
    async signUp(request, res) {
        return authModule.signUp(request.body, res);
    },

    async login(request, res) {
        // ip: the address the server saw (saved on the session and in the login history), not one the app sends
        return authModule.login({ ...request.body, ip: request.ip }, res);
    },

    async sendOtp(request, res) {
        return authModule.sendOtp(request.body, res);
    },

    async verifyOtp(request, res) {
        return authModule.verifyOtp({ ...request.body, ip: request.ip }, res);
    },

    async completeProfile(request, res) {
        return authModule.completeProfile(request, res);
    },

    async getProfile(request, res) {
        return authModule.getProfile(request, res);
    },

    async editProfile(request, res) {
        return authModule.editProfile(request, res);
    },

    async verifyEmailChange(request, res) {
        return authModule.verifyEmailChange(request, res);
    },

    async changePassword(request, res) {
        return authModule.changePassword(request, res);
    },

    async logout(request, res) {
        return authModule.logout(request, res);
    },
};

export default authController;
