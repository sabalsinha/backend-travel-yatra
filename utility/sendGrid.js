// sendEmail.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, text, html }) => {
    console.log("Sending email via SendGrid to:", to);
  const msg = {
    to,
    from: "travelyatra522018@gmail.com", // your verified sender email
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
