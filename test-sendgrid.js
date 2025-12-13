import sgMail from "@sendgrid/mail";

const API_KEY = "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";

sgMail.setApiKey(API_KEY);

const msg = {
  to: "travelyatra522018@gmail.com",
  from: "enquiry@travel-yatra.com",
  subject: "Test Email from SendGrid",
  text: "This is a test email",
  html: "<strong>This is a test email</strong>",
};

sgMail
  .send(msg)
  .then(() => {
    console.log("✅ Email sent successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ SendGrid Error:", error.response?.body || error.message);
    process.exit(1);
  });
