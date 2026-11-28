import constant from "./constant.js";

// Every email in the society's receipt design (the DON receipt PDF, 2026-11-23): grey band, logo + society name in
// maroon + the mail's title, contact on the right, a greeting, the grey box (label - value rows), the mail's own part,
// the grey Note panel, a dotted line and the society's address + telephone at the bottom.
// Email clients need tables and inline styles (no flexbox, no <style>), and Gmail blocks embedded images, so the logo
// is App Settings' logo link (https only). society = common.mailSociety(): { name, phone, address, logo_url }

// Text typed by people goes into the HTML as text, never as markup
const escapeHtml = (text) => String(text ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// "+91 76007 60370 / +91 7600 767 475" → both numbers
const phonesOf = (phone) => String(phone ?? "").split(/[/,;]+/).map((p) => p.trim()).filter(Boolean);

// A long name on two lines, broken at the last space before the middle ("Shri Gaamtoda / Yuvak Mitra Mandal")
const twoLines = (text) => {
  const spaces = [...text.matchAll(/ /g)].map((m) => m.index);
  if (text.length < 20 || !spaces.length) return [text];
  const at = spaces.filter((i) => i <= text.length / 2).pop() ?? spaces[0];
  return [text.slice(0, at), text.slice(at + 1)];
};

const FONT = "font-family:Helvetica,Arial,sans-serif;";
const GREY = "#787878";
const DARK = "#333333";

// One row of the grey box: [label, value] (plain text, escaped here); a label-less row shows the value in bold
const boxRow = ([label, value], i) => `
              <tr>
                <td style="${FONT}padding:10px 0;font-size:14px;color:${DARK};${i ? "border-top:1px dashed #CDCDCD;" : ""}">
                  ${label ? `<strong>${escapeHtml(label)} -</strong> ${escapeHtml(value)}` : `<strong>${escapeHtml(value)}</strong>`}
                </td>
              </tr>`;

// The whole email. greeting / intro / note / thanks are plain text; mainHtml is the mail's own part (already HTML)
const mailLayout = ({ society = {}, title, preheader = "", greeting = "", intro = "", box = [], mainHtml = "", note, thanks }) => {
  const name = String(society.name || process.env.APP_NAME || "Society");
  const phones = phonesOf(society.phone).map(escapeHtml);
  const address = escapeHtml(society.address || "");
  const logo = /^https:\/\//.test(society.logo_url || "") ? society.logo_url : null;
  const contact = phones.length || address
    ? `<strong style="color:${DARK};">Contact</strong><br />${phones.join("<br />")}${address ? `<br /><br />${address}` : ""}`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F3;${FONT}color:${DARK};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#F4F4F3" style="background:#F4F4F3;padding:20px 8px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#FFFFFF" style="max-width:600px;background:#FFFFFF;">
          <!-- Grey band -->
          <tr><td height="12" bgcolor="#9E9E9E" style="background:#9E9E9E;height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>
          <!-- Logo, society name + title, contact -->
          <tr>
            <td style="padding:16px 20px 14px;border-bottom:1px solid #DDDDDD;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${logo ? `<td width="84" valign="middle" style="padding-right:14px;"><img src="${escapeHtml(logo)}" width="84" height="84" alt="" style="display:block;width:84px;height:84px;border:0;" /></td>` : ""}
                  <td valign="middle" style="${FONT}">
                    <div style="font-size:24px;line-height:1.15;font-weight:700;color:#7A1020;">${twoLines(name).map(escapeHtml).join("<br />")}</div>
                    <div style="padding-top:4px;font-size:13px;color:${GREY};">${escapeHtml(title)}</div>
                  </td>
                  ${contact ? `<td valign="top" align="right" style="${FONT}padding-left:12px;font-size:12px;line-height:1.5;color:${GREY};max-width:200px;">${contact}</td>` : ""}
                </tr>
              </table>
            </td>
          </tr>
          <!-- Greeting -->
          ${greeting || intro ? `
          <tr>
            <td style="${FONT}padding:18px 32px 0;font-size:14px;line-height:1.6;color:${DARK};">
              ${greeting ? `<p style="margin:0 0 10px;">${escapeHtml(greeting)}</p>` : ""}
              ${intro ? `<p style="margin:0;">${escapeHtml(intro)}</p>` : ""}
            </td>
          </tr>` : ""}
          <!-- Grey box -->
          ${box.length ? `
          <tr>
            <td style="padding:16px 18px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#F0F0EF" style="background:#F0F0EF;border:1px solid #DEDEDE;border-radius:10px;border-collapse:separate;">
                <tr><td style="padding:4px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${box.map(boxRow).join("")}
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>` : ""}
          <!-- The mail's own part -->
          ${mainHtml}
          <!-- Note panel -->
          <tr>
            <td bgcolor="#F0F0EF" style="background:#F0F0EF;padding:12px 32px 16px;">
              <span style="${FONT}display:inline-block;background:#D6D6D6;color:#FFFFFF;font-weight:700;font-size:11px;padding:4px 12px;border-radius:4px;">Note</span>
              <div style="${FONT}padding-top:10px;font-size:12px;line-height:1.6;color:${GREY};">${escapeHtml(note)}</div>
            </td>
          </tr>
          <!-- Dotted thank-you line -->
          <tr>
            <td style="padding:14px 18px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr><td align="center" style="${FONT}border:1px dashed #BEBEBE;padding:12px;font-size:14px;color:${DARK};">${escapeHtml(thanks)}</td></tr>
              </table>
            </td>
          </tr>
          <!-- Footer: society + address, telephone -->
          <tr>
            <td style="padding:16px 20px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="top" style="${FONT}font-size:12px;line-height:1.5;color:${GREY};">
                    <strong style="font-size:13px;color:${DARK};">${escapeHtml(name)}</strong>${address ? `<br />${address}` : ""}
                  </td>
                  ${phones.length ? `<td valign="top" align="right" style="${FONT}font-size:12px;line-height:1.5;color:${GREY};">Tel: ${phones.join(" / ")}</td>` : ""}
                </tr>
              </table>
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

// The OTP mail (sign-up, login, email change)
const createOtpWmailTemplate = ({ society = {}, userName = "", otp, otpType = constant.OTP_PURPOSE.SIGNUP }) => {
  const name = society.name || process.env.APP_NAME || "Society";
  const titles = { forgot_password: "Password Reset", login: "Login Verification", email_change: "Email Verification" };
  const title = titles[otpType] || "Signup Verification";
  const intros = {
    forgot_password: "Enter this code in the app to reset your password.",
    login: "Enter this code in the app to log in to your account.",
    email_change: "Enter this code in the app to confirm your new email address.",
  };
  const intro = intros[otpType] || "Enter this code in the app to verify your email and finish signing up.";
  const expireMinutes = constant.OTP_EXPIRY_MINUTES;

  return mailLayout({
    society,
    title,
    preheader: `${title} OTP, valid for ${expireMinutes} minutes.`,
    greeting: `Dear ${userName || "Member"} ,`,
    intro,
    box: [["", name], ["Purpose", title], ["Valid for", `${expireMinutes} minutes`]],
    mainHtml: `
          <tr>
            <td align="center" style="padding:22px 32px 20px;">
              <div style="${FONT}padding-bottom:8px;font-size:13px;color:${GREY};">Your one-time password</div>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="${FONT}border:1px dashed #CDCDCD;padding:12px 18px 12px 26px;font-size:32px;line-height:1.2;font-weight:700;letter-spacing:8px;color:#7A1020;">${escapeHtml(otp)}</td>
                </tr>
              </table>
              <div style="${FONT}padding-top:10px;font-size:13px;color:${GREY};">Expires in <strong style="color:${DARK};">${expireMinutes} minutes</strong></div>
            </td>
          </tr>`,
    note: `Never share this code with anyone, including ${name} members or staff. If you didn't request it, you can safely ignore this email. This is an automated email; please do not reply.`,
    thanks: `Thank you for being part of ${name}.`,
  });
};

// "Publish and Share (email)": a new event or notice, mailed to the members (common.emailMembers).
//   heading  "New Event" / "New Notice";  details  [[label, value]] rows (date, venue…), empty values left out
const createContentMailTemplate = ({ society = {}, heading, title, details = [], body = "" }) => {
  const name = society.name || process.env.APP_NAME || "Society";
  return mailLayout({
    society,
    title: heading,
    preheader: title,
    greeting: "Dear Member ,",
    intro: `${name} has shared a new ${String(heading).replace(/^New /i, "").toLowerCase()} with you. The details are below.`,
    box: [["", name], [heading, title], ...details.filter(([, value]) => value)],
    mainHtml: `
          <tr>
            <td style="${FONT}padding:18px 32px 0;">
              <div style="font-size:16px;font-weight:700;color:${DARK};">${escapeHtml(title)}</div>
              ${body ? `<div style="padding-top:8px;font-size:14px;line-height:1.6;color:${DARK};white-space:pre-line;">${escapeHtml(body)}</div>` : ""}
              <div style="padding:14px 0 20px;font-size:13px;color:${GREY};">Open the society app for the details.</div>
            </td>
          </tr>`,
    note: `You get this email as a member of ${name}. This is an automated email; please do not reply.`,
    thanks: "Thank you for being part of the society.",
  });
};

export { createOtpWmailTemplate, createContentMailTemplate };
