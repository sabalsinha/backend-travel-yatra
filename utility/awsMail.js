import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: "us-east-1", // your region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

export async function sendEmail(source, toAddresses, subject, body, otp) {
    const html = `
    <h1>Your travel enquiry verification OTP is:</h1>
    <h2>${otp}</h2>
    <p>This OTP is valid for 5 minutes.</p>
  `;
  const params = {
    Source: source,
    Destination: {
      ToAddresses: [toAddresses],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html},
        Text: { Data: body },
      },
    },
  };

  try {
    const data = await ses.send(new SendEmailCommand(params));
    console.log("Email sent:", data);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

