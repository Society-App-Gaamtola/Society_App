export default {
    IMAGE_BASE_URL: `${process.env.BASE_URL || "http://localhost:5020"}/uploads/`,

    // Values stored in the JWT `role` claim, matching roles.code (users.role_id → roles.id)
    ROLES: {
        SUPER_ADMIN: "super_admin",
        EXECUTIVE: "executive",
        MEMBER: "member",
    },

    LANGUAGES: ["en", "hi", "gu"],

    // Saved in declaration_acceptances when a user accepts the terms on the Profile & Address screen
    DECLARATION_VERSION: "1.0",
}
