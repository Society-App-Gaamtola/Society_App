import adminModule from "../module/adminModule.js";

const adminController = {
    async login(request, res) {
        return adminModule.login(request, res);
    },

    async getDashboard(request, res) {
        return adminModule.getDashboard(request, res);
    },

    async createMember(request, res) {
        return adminModule.createMember(request, res);
    },

    async getMembers(request, res) {
        return adminModule.getMembers(request, res);
    },

    async getMemberDetails(request, res) {
        return adminModule.getMemberDetails(request, res);
    },

    async editMember(request, res) {
        return adminModule.editMember(request, res);
    },

    async setMemberStatus(request, res) {
        return adminModule.setMemberStatus(request, res);
    },

    async deleteMember(request, res) {
        return adminModule.deleteMember(request, res);
    },

    async getExecutives(request, res) {
        return adminModule.getExecutives(request, res);
    },

    async setExecutivePermissions(request, res) {
        return adminModule.setExecutivePermissions(request, res);
    },

    async getDonations(request, res) {
        return adminModule.getDonations(request, res);
    },

    async getDonationDetails(request, res) {
        return adminModule.getDonationDetails(request, res);
    },

    async saveDonation(request, res) {
        return adminModule.saveDonation(request, res);
    },

    async setDonationStatus(request, res) {
        return adminModule.setDonationStatus(request, res);
    },

    async deleteDonation(request, res) {
        return adminModule.deleteDonation(request, res);
    },

    async getExpenses(request, res) {
        return adminModule.getExpenses(request, res);
    },

    async getExpenseDetails(request, res) {
        return adminModule.getExpenseDetails(request, res);
    },

    async saveExpense(request, res) {
        return adminModule.saveExpense(request, res);
    },

    async setExpenseStatus(request, res) {
        return adminModule.setExpenseStatus(request, res);
    },

    async deleteExpense(request, res) {
        return adminModule.deleteExpense(request, res);
    },

    async getFinanceOverview(request, res) {
        return adminModule.getFinanceOverview(request, res);
    },

    async getReports(request, res) {
        return adminModule.getReports(request, res);
    },

    async saveReport(request, res) {
        return adminModule.saveReport(request, res);
    },

    async deleteReport(request, res) {
        return adminModule.deleteReport(request, res);
    },

    async getReportData(request, res) {
        return adminModule.getReportData(request, res);
    },

    async getBackup(request, res) {
        return adminModule.getBackup(request, res);
    },

    async getAppSettings(request, res) {
        return adminModule.getAppSettings(request, res);
    },

    async saveAppSettings(request, res) {
        return adminModule.saveAppSettings(request, res);
    },
};

export default adminController;
