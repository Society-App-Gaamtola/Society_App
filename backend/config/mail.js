const createOtpWmailTemplate = ({ userName = "User", otp, otpType = "signup" }) => {
  const appName = process.env.APP_NAME || "Gaamtoda Mitra Mandal";
  const titles = { forgot_password: "Password Reset", login: "Login Verification", email_change: "Email Verification" };
  const title = titles[otpType] || "Signup Verification";
  const expireMinutes = 5;
 
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName} OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:10px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <tr>
            <td style="font-size:22px;font-weight:700;color:#0f172a;">${appName}</td>
          </tr>
          <tr>
            <td style="padding-top:8px;font-size:18px;font-weight:600;color:#111827;">${title}</td>
          </tr>
          <tr>
            <td style="padding-top:14px;font-size:14px;line-height:1.6;">
              Hello ${userName},<br />
              Use the OTP below to continue.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 0;">
              <div style="display:inline-block;padding:12px 22px;border-radius:8px;background:#e8f0fe;color:#0b57d0;font-size:28px;letter-spacing:6px;font-weight:700;">
                ${otp}
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#4b5563;line-height:1.6;">
              This OTP expires in ${expireMinutes} minutes. Do not share this code with anyone.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
};
 
export { createOtpWmailTemplate };
 