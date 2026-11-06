const createOtpWmailTemplate = ({ userName = "there", otp, otpType = "signup" }) => {
  const appName = process.env.APP_NAME || "Gaamtoda Mitra Mandal";
  const titles = { forgot_password: "Password Reset", login: "Login Verification", email_change: "Email Verification" };
  const title = titles[otpType] || "Signup Verification";
  const intros = {
    forgot_password: "Enter this code in the app to reset your password.",
    login: "Enter this code in the app to log in to your account.",
    email_change: "Enter this code in the app to confirm your new email address.",
  };
  const intro = intros[otpType] || "Enter this code in the app to verify your email and finish signing up.";
  const expireMinutes = 5;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${appName} OTP</title>
</head>
<body style="margin:0;padding:0;background:#FFF8EE;font-family:Arial,Helvetica,sans-serif;color:#2B1A12;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title} OTP, valid for ${expireMinutes} minutes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFF8EE" style="background:#FFF8EE;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="max-width:520px;background:#FFFFFF;border:1px solid #EADFCF;border-radius:12px;border-collapse:separate;">
          <tr>
            <td align="center" bgcolor="#7A1020" style="background:#7A1020;border-radius:11px 11px 0 0;border-bottom:3px solid #C9A24A;padding:22px 24px;font-size:20px;font-weight:700;color:#FFFFFF;">
              ${appName}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 0;font-size:20px;font-weight:700;color:#2B1A12;">${title}</td>
          </tr>
          <tr>
            <td style="padding:10px 28px 0;font-size:15px;line-height:1.6;color:#2B1A12;">
              Hello ${userName},<br />
              ${intro}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" bgcolor="#FFF8EE" style="background:#FFF8EE;border:1px solid #E8D4A2;border-radius:10px;padding:14px 20px 14px 28px;font-size:32px;line-height:1.2;font-weight:700;letter-spacing:8px;color:#7A1020;">
                    ${otp}
                  </td>
                </tr>
              </table>
              <div style="padding-top:12px;font-size:13px;color:#7A6A5E;">
                Expires in <strong style="color:#2B1A12;">${expireMinutes} minutes</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top:1px solid #EADFCF;padding-top:16px;font-size:13px;line-height:1.6;color:#7A6A5E;">
                    <strong style="color:#2B1A12;">Never share this code</strong> with anyone, including ${appName} members or staff.
                    If you didn't request it, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:16px 12px 0;font-size:12px;line-height:1.5;color:#7A6A5E;">
              This is an automated email from ${appName}. Please do not reply.
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
