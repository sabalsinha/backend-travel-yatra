// sendEmail.js - Nodemailer SMTP
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const sendEmail = async ({ to, subject, text, html }) => {
  console.log("Sending email via SMTP to:", to);
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    cc: 'travelyatra98@gmail.com',
    subject,
    text,
    html,
  };

  try {
    const response = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", response.messageId);
    return { success: true, response };
  } catch (error) {
    console.error("❌ SMTP Error:", error.message || error);
    return { success: false, error };
  }
};
