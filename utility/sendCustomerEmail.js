// sendCustomerEmail.js - Send enquiry confirmation email to customers
import { sendEmail } from './sendGrid.js';

export const sendCustomerEnquiryEmail = async (customerName, customerEmail) => {
  try {
    if (!customerName || !customerEmail) {
      console.log('⚠️ Missing customer name or email');
      return { success: false, message: 'Missing customer details' };
    }

    const htmlTemplate = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
  <body style="background: #f4f6f8; margin:0; padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <tr style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);">
        <td style="padding:30px; text-align:center;">
          <img src="https://res.cloudinary.com/dxhl6umss/image/upload/v1763660196/logo-1_gou8qf.png" alt="Travel-Yatra" style="max-width:150px; height:auto;" />
          <h1 style="color:#fff; margin:15px 0 0 0; font-size:24px;">Thank You for Your Enquiry!</h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px; color:#333; line-height:1.6;">
          <p style="font-size:16px; margin:0 0 20px 0;">
            Hi <strong>${customerName}</strong>,
          </p>

          <p style="font-size:15px; margin:0 0 15px 0;">
            Thank you for contacting <strong>Travel-Yatra</strong> 😊
          </p>

          <p style="font-size:15px; margin:0 0 15px 0;">
            We have received your travel enquiry successfully.
          </p>

          <p style="font-size:15px; margin:0 0 20px 0;">
            To share the best itinerary, hotel options, and pricing for your trip, could you please help us with a few quick details?
          </p>

          <div style="background:#f8f9fa; padding:20px; border-left:4px solid #0d6efd; margin:20px 0; border-radius:5px;">
            <p style="margin:0 0 10px 0; font-size:15px; color:#333;">
              <strong>• Destination you want to visit</strong>
            </p>
            <p style="margin:0 0 10px 0; font-size:15px; color:#333;">
              <strong>• Travel dates (approx)</strong>
            </p>
            <p style="margin:0 0 10px 0; font-size:15px; color:#333;">
              <strong>• Number of adults & children</strong>
            </p>
            <p style="margin:0 0 10px 0; font-size:15px; color:#333;">
              <strong>• Budget per person (if any)</strong>
            </p>
            <p style="margin:0 0 10px 0; font-size:15px; color:#333;">
              <strong>• Hotel category preference (3★ / 4★ / 5★)</strong>
            </p>
            <p style="margin:0; font-size:15px; color:#333;">
              <strong>• Flight required or only land package</strong>
            </p>
          </div>

          <p style="font-size:15px; margin:0 0 15px 0;">
            You can simply <strong>reply to this email</strong> or <strong>message us on WhatsApp</strong> with these details.
          </p>

          <p style="font-size:15px; margin:0 0 20px 0;">
            📞 Our travel expert will also <strong>call/WhatsApp you shortly</strong> to assist you personally and provide the best available deals.
          </p>

          <p style="font-size:15px; margin:0 0 30px 0;">
            Thank you for choosing Travel-Yatra.
            <br/>We look forward to planning a wonderful trip for you ✨
          </p>

          <p style="font-size:15px; margin:0 0 20px 0;">
            <strong>Warm Regards,</strong>
            <br/><strong>Team Travel-Yatra</strong>
          </p>

          <div style="background:#f1f3f5; padding:15px; border-radius:5px; margin:20px 0;">
            <p style="margin:0 0 8px 0; font-size:14px; color:#333;">
              📲 <strong>Call/WhatsApp:</strong> 7258041363
            </p>
            <p style="margin:0; font-size:14px; color:#333;">
              🌐 <strong>Website:</strong> <a href="http://www.travel-yatra.com" style="color:#0d6efd; text-decoration:none;">www.travel-yatra.com</a>
            </p>
          </div>

        </td>
      </tr>

      <!-- Footer -->
      <tr style="background:#f1f3f5;">
        <td style="text-align:center; padding:20px; color:#999; font-size:12px;">
          © 2024 Travel-Yatra. All rights reserved.
        </td>
      </tr>

    </table>
  </body>
</html>`;

    console.log('📧 Sending customer enquiry confirmation email to:', customerEmail);

    const result = await sendEmail({
      to: customerEmail,
      subject: 'We Received Your Travel Enquiry - Travel-Yatra',
      text: `Hi ${customerName}, Thank you for contacting Travel-Yatra. We have received your travel enquiry successfully.`,
      html: htmlTemplate,
    });

    if (result && result.success) {
      console.log('✅ Customer enquiry email sent successfully!');
      console.log('✅ Message ID:', result.response.messageId);
      console.log('✅ Recipient:', customerEmail);
      return { success: true, message: 'Email sent successfully' };
    } else {
      console.error('❌ Failed to send customer email:', result?.error || 'Unknown error');
      return { success: false, error: result?.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Exception while sending customer email:', error.message);
    return { success: false, error: error.message };
  }
};
