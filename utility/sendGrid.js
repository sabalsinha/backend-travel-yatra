// sendEmail.js - Nodemailer SMTP
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("🔐 Initializing SMTP Transporter with:");
console.log("   User:", process.env.SMTP_USER);
console.log("   Password: [HIDDEN]");

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
  },
  pool: {
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5  // 5 emails per second
  },
  connectionTimeout: 10000,
  socketTimeout: 10000
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Transporter verification failed:", error);
  } else {
    console.log("✅ SMTP Transporter is ready to send emails");
  }
});

export const sendEmail = async ({ to, subject, text, html, cc = null }) => {
  console.log("\n📧 ============= EMAIL SENDING REQUEST =============");
  console.log("📧 To:", to);
  console.log("📧 CC:", cc || "None");
  console.log("📧 Subject:", subject);
  console.log("📧 Time:", new Date().toLocaleTimeString());
  console.log("📧 ================================================\n");
  
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  };

  // Add CC only if provided
  if (cc) {
    mailOptions.cc = cc;
    console.log("📧 CC added to mailOptions:", cc);
  }

  try {
    console.log("📧 Preparing to send email...");
    console.log("📧 From:", mailOptions.from);
    console.log("📧 To:", mailOptions.to);
    console.log("📧 CC (in mailOptions):", mailOptions.cc || "None");
    console.log("📧 Complete mailOptions:", JSON.stringify(mailOptions, null, 2).substring(0, 500));
    
    const response = await transporter.sendMail(mailOptions);
    
    console.log("\n✅ ============= EMAIL SENT SUCCESSFULLY =============");
    console.log("✅ Message ID:", response.messageId);
    console.log("✅ Accepted recipients:", response.accepted);
    console.log("✅ Rejected recipients:", response.rejected);
    console.log("✅ To:", response.envelope.to);
    console.log("✅ CC (in response):", response.envelope.cc || "None");
    console.log("✅ ===================================================\n");
    
    return { success: true, response };
  } catch (error) {
    console.error("\n❌ ============= EMAIL SENDING FAILED =============");
    console.error("❌ Error message:", error.message);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error response:", error.response);
    console.error("❌ Full error object:", error);
    console.error("❌ ================================================\n");
    
    return { success: false, error: error.message };
  }
};
