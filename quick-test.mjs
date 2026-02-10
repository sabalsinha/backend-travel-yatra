import dotenv from "dotenv";
dotenv.config();
import { sendEmail } from './utility/sendGrid.js';

console.log("\n✉️  QUICK EMAIL TEST\n");

const result1 = await sendEmail({
  to: "aniketmailme2011@gmail.com",
  subject: "Enquiry Confirmation",
  text: "Thank you",
  html: "<h1>Thanks</h1>"
});

console.log("Customer Email:", result1.success ? "✅ SENT" : "❌ FAILED");

const result2 = await sendEmail({
  to: "travelyatra522018@gmail.com",
  cc: "travelyatra98@gmail.com",
  subject: "Admin Notification",
  text: "New booking",
  html: "<h1>New Booking</h1>"
});

console.log("Admin Email:", result2.success ? "✅ SENT" : "❌ FAILED");

process.exit(0);
