import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "email-smtp.us-east-1.amazonaws.com",
  port: 465,
  secure: true,
  auth: {
    user: "AKIA3YRP6BF4FRZYC3K4",
    pass: "BBb6alfecFg0Wug0mAjclAKABaZDoHIOF1xSnpGxiWCj",
  },
});


export async function sendOtpEmail(to, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Your Travel Enquiry Verification OTP</h2>
      <p>Your OTP is:</p>
      <h1 style="color: #2d6cdf;">${otp}</h1>
      <p>This OTP is valid for <strong>5 minutes</strong>.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: "aniketmailme2011@gmail.com",   // must be SES verified
      to,
      subject: "Your Verification OTP",
      html,
      text: `Your OTP is ${otp}`,    // fallback for old email clients
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
}
