import dotenv from "dotenv";
dotenv.config();
import { sendEmail } from './utility/sendGrid.js';

console.log("\n🧪 TESTING EMAIL FUNCTIONALITY\n");

const testEmail = async () => {
  try {
    console.log("🔧 Test 1: Sending customer enquiry email");
    const result1 = await sendEmail({
      to: "aniketmailme2011@gmail.com",
      subject: "Test Customer Email - Travel-Yatra",
      text: "Hi Test User, thank you for your enquiry!",
      html: "<h1>Test Email</h1><p>This is a test customer email</p>"
    });

    console.log("\n📊 Test 1 Result:", result1.success ? "✅ SUCCESS" : "❌ FAILED");
    if (!result1.success) {
      console.log("Error:", result1.error);
    }

    console.log("\n🔧 Test 2: Sending admin notification with CC");
    const result2 = await Promise.race([
      sendEmail({
        to: "travelyatra522018@gmail.com",
        cc: "travelyatra98@gmail.com",
        subject: "Test Admin Email - New Booking",
        text: "Admin: New booking received",
        html: "<h1>Test Admin Email</h1><p>This is a test admin email with CC</p>"
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
    ]);

    console.log("\n📊 Test 2 Result:", result2.success ? "✅ SUCCESS" : "❌ FAILED");
    if (!result2.success) {
      console.log("Error:", result2.error);
    }

    console.log("\n✨ All tests completed!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test error:", error.message);
    process.exit(1);
  }
};

testEmail();
