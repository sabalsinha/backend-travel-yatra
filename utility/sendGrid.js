// sendEmail.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, text, html }) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL, // your verified sender email
    subject,
    text,
    html,
  };

  try {
    const response = await sgMail.send(msg);
    return { success: true, response };
  } catch (error) {
    console.error("SendGrid Error:", error.response?.body || error);
    return { success: false, error };
  }
};
