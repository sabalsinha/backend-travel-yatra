import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import compression from "compression";
import { Connection } from "./database/connecDb.js";
import Booking from './schema/clientSchema.js';
import Package from './schema/packageSchema.js';
import Otp from './schema/otpSchema.js';
import Contact from './schema/contactSchema.js';
import mongoose from "mongoose";
// import axios from 'axios';
import cors from "cors";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import Login from "./schema/loginSchema.js";
import { auth } from "./middleware/auth.js";
import jwt from "jsonwebtoken";
import cron from "node-cron";
// import { basicAuth } from './utility/auth.js';
// import helmet from 'helmet';
// import mongoSanitize from "express-mongo-sanitize";
import { sendEmail } from './utility/sendGrid.js';
import { sendCustomerEnquiryEmail } from './utility/sendCustomerEmail.js';
// import { sendEmail } from './utility/awsMail.js';
// import { sendOtpEmail } from './utility/awsNodemailer.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  // Use a resilient key generator to avoid invalid IP parsing behind proxies
  keyGenerator: (req) => {
    // Prefer X-Forwarded-For first value, then X-Real-IP, then req.ip/socket
    const xff = req.headers["x-forwarded-for"];
    const forwarded = Array.isArray(xff)
      ? xff[0]
      : (typeof xff === "string" ? xff.split(",")[0] : undefined);
    const candidate = forwarded
      || (typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"] : undefined)
      || req.ip
      || (req.socket && req.socket.remoteAddress)
      || "unknown";

    // Sanitize: trim, remove leading backslashes or spaces
    return String(candidate).trim().replace(/^\\+/, "");
  }
});



const app = express();
app.use(compression());
app.use(express.json());

// Trust proxy BEFORE rate limiter so req.ip resolves correctly
app.set('trust proxy', 1); // Trust Railway proxy
app.use(limiter);
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// ✅ CRON JOB — Keep MongoDB Warm (Every 5 Minutes)
cron.schedule("*/10 * * * *", async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      console.log("✅ MongoDB is warm:", new Date().toLocaleTimeString());
    } else {
      console.log("⚠️ MongoDB not connected");
    }
  } catch (err) {
    console.error("❌ MongoDB warm-up failed:", err.message);
  }
});
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;
  res.json({
    success: isConnected,
    message: isConnected ? "Server & DB alive ✅" : "DB not ready ❌",
    db_state: dbState
  });
});

// Seed endpoint (one-time use in production)
app.post("/api/seed", async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'travelyatra522018@gmail.com';
    
    // Check if admin exists
    let admin = await Login.findOne({ email: adminEmail });
    if (!admin) {
      const hashed = await bcrypt.hash('Admin@1234', 10);
      admin = new Login({
        name: 'Admin',
        email: adminEmail,
        password: hashed,
        role: 'admin',
      });
      await admin.save();
    }

    // Check if package exists
    let pkg = await Package.findOne();
    if (!pkg) {
      pkg = new Package({
        title: 'Sample Package - Seeded',
        description: 'This is a sample package created by seed endpoint.',
        priceMin: 99,
        priceMax: 199,
        duration: '3 days',
        imageUrl: 'https://via.placeholder.com/800x600.png?text=Travel+Yatra+Sample+Package',
        location: 'Sample Location',
        person: 2,
      });
      await pkg.save();
    }

    res.json({
      success: true,
      message: 'Database seeded successfully',
      admin: { email: admin.email },
      package: { title: pkg.title }
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for email:", email);

    // 1️⃣ Find admin
    const admin = await Login.findOne({ email });
    console.log("admin",admin)
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // 3️⃣ Create JWT
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 4️⃣ Send response
    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
      },
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.get("/api/bookings", auth, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch bookings" });
  }
});

// Assign a booking to a contact and email the lead details
app.post("/api/bookings/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { assigneeEmail, assigneeName, cc } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    if (!assigneeEmail) {
      return res.status(400).json({ success: false, message: "assigneeEmail is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const displayName = assigneeName || "Team Member";

    const html = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
  <body style="background: #f4f6f8; margin:0; padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
      <tr style="background:#0d6efd;">
        <td style="padding:24px; text-align:center; color:#fff;">
          <img src="https://res.cloudinary.com/dxhl6umss/image/upload/v1763660196/logo-1_gou8qf.png" alt="Travel-Yatra" style="max-width:140px; height:auto; display:block; margin:0 auto 6px;" />
          <div style="font-size:20px;">New Lead Assigned to ${displayName}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 12px; color:#333;">Hello ${displayName},</p>
          <p style="margin:0 0 16px; color:#555;">You have been assigned the following lead. Please reach out to the customer and proceed with the next steps.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
            <tr><td style="padding:8px 0; width:32%; color:#666; font-weight:bold;">Name:</td><td style="padding:8px 0; color:#333;">${booking.name || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Email:</td><td style="padding:8px 0; color:#333;">${booking.email || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Phone:</td><td style="padding:8px 0; color:#333;">${booking.phone || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Package:</td><td style="padding:8px 0; color:#333;">${booking.package || 'N/A'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Travel Date:</td><td style="padding:8px 0; color:#333;">${booking.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Adults:</td><td style="padding:8px 0; color:#333;">${booking.adults ?? '0'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Children:</td><td style="padding:8px 0; color:#333;">${booking.children ?? '0'}</td></tr>
            <tr><td style="padding:8px 0; color:#666; font-weight:bold;">Message:</td><td style="padding:8px 0; color:#333;">${booking.message || 'No additional message'}</td></tr>
          </table>
          <div style="background:#f8f9fa; padding:14px; border-left:4px solid #0d6efd;">
            <div style="color:#666; font-size:14px;"><strong>Tip:</strong> Reply to the customer within 24 hours for better conversion.</div>
          </div>
          <p style="color:#999; font-size:12px; margin-top:18px;">Assigned on ${new Date().toLocaleString()}</p>
        </td>
      </tr>
      <tr style="background:#f1f3f5;">
        <td style="text-align:center; padding:16px; color:#999; font-size:12px;">© ${new Date().getFullYear()} Travel-Yatra. All rights reserved.</td>
      </tr>
    </table>
  </body>
</html>`;

    const result = await sendEmail({
      to: assigneeEmail,
      subject: `Lead Assigned: ${booking.name || 'Customer'} - ${booking.package || 'Package'}`,
      text: `You have been assigned a new lead: ${booking.name} (${booking.email || 'N/A'})`,
      html,
      cc: cc || (process.env.ADMIN_EMAIL || process.env.SMTP_USER)
    });

    if (!result || !result.success) {
      return res.status(500).json({ success: false, message: result?.error || "Failed to send assignment email" });
    }

    res.json({ success: true, message: "Assignment email sent", data: { bookingId: booking._id, assigneeEmail } });
  } catch (error) {
    console.error("Error assigning booking:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/contacts", async (req, res) => {
  try {
    const { name, contact, email } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const trimmedContact = typeof contact === "string" ? contact.trim() : undefined;

    if (!trimmedName || !trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const newContact = new Contact({
      name: trimmedName,
      email: trimmedEmail,
      contact: trimmedContact || undefined,
    });

    await newContact.save();

    res.status(201).json({
      success: true,
      message: "Contact saved successfully",
      data: newContact,
    });
  } catch (error) {
    console.error("Error saving contact:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


app.post("/upload-package", async (req, res) => {
  try {
    const {
      title,
      description,
      priceMin,
      priceMax,
      duration,
      imageUrl,
      location,
    } = req.body;

    // Basic validation
    if (!title || !priceMin || !priceMax || !duration || !imageUrl || !location) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const newPackage = new Package({
      title,
      description,
      priceMin,
      priceMax,
      duration,
      imageUrl,
      location,
    });

    await newPackage.save();

    res.status(201).json({
      success: true,
      message: "Package uploaded successfully",
      data: newPackage
    });

  } catch (error) {
    console.error("Error uploading package:", error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

app.get("/get-packages", /*basicAuth,*/ async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: packages.length,
      data: packages
    });
  } catch (error) {
    console.error("Error fetching packages:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    });

    console.log("Email sent successfully");
    return true;
  } catch (err) {
    console.error("Email Error:", err);
    return false;
  }
};

app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;


    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const html = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
  <body style="background: #f4f6f8; margin:0; padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden;">
      
      <!-- Header -->
      <tr style="background:#0d6efd;">
        <td style="padding:20px; text-align:center;">
          <img src="https://res.cloudinary.com/dxhl6umss/image/upload/v1763660196/logo-1_gou8qf.png" alt="Company Logo" style="max-width:120px; height:auto;" />
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px;">
          <h2 style="color:#333; margin:0;">Your Verification Code</h2>
          <p style="color:#555; font-size:15px; margin-top:10px;">
            Use the OTP below to complete your verification for the Trip Enquiry.
          </p>

          <div style="margin:25px 0; text-align:center;">
            <div style="display:inline-block; background:#0d6efd; color:#fff; font-size:32px; 
                        letter-spacing:4px; padding:12px 25px; border-radius:8px; font-weight:bold;">
              ${generatedOtp}
            </div>
          </div>

          <p style="color:#555; font-size:15px; margin:0;">
            This OTP is valid for <strong>5 minutes</strong>.  
            Do not share this code with anyone.
          </p>

          <p style="color:#999; font-size:12px; margin-top:25px;">
            If you did not request this OTP, please ignore this email.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr style="background:#f1f3f5;">
        <td style="text-align:center; padding:15px; color:#999; font-size:12px;">
          © 2018 Travel-Yatra. All rights reserved.
        </td>
      </tr>

    </table>
  </body>
</html>
`

    const emailSent = await sendEmail({
      to: email || 'travelyatra522018@gmail.com',
      subject: "Trip Enquiry Verification OTP",
      text: "Please use this otp for verification",
      html: html,
    });
    if (!emailSent) {
      console.log("Failed to send OTP email");
      return res.json({
        success: false,
        message: "Failed to send OTP email"
      });
    }
    // Store OTP
    await Otp.create({ email, otp: generatedOtp });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email, otp });

    if (!record) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid → delete OTP so it can't be reused
    await Otp.deleteMany({ email });

    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.post("/book", async (req, res) => {
  try {
    // working code for otp verification — to be implemented later
    // const { phone } = req.body;
    // const otpRecord = await Otp.findOne({ phone });
    // if (otpRecord) {
    //   return res.json({ success: false, message: "OTP not verified" });
    // }

    const booking = new Booking(req.body);
    await booking.save();
    console.log("💾 Booking saved with id:", booking._id);

    // ✅ Send emails in BACKGROUND (non-blocking) for fast API response
    // Emails will be sent asynchronously without waiting
    if (booking.email && booking.name) {
      // Send customer email in background
      sendCustomerEnquiryEmail(booking.name, booking.email)
        .then((result) => {
          if (result && result.success) {
            console.log("✅ Customer enquiry email sent successfully to:", booking.email);
          } else {
            console.error("❌ Failed to send customer email:", result?.error || 'unknown error');
          }
        })
        .catch(err => {
          console.error('❌ Error sending customer email:', err.message);
        });
    }

    // ✅ Send admin notification email in BACKGROUND (non-blocking)
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      
      const html = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
  <body style="background: #f4f6f8; margin:0; padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <tr style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);">
        <td style="padding:30px; text-align:center;">
          <img src="https://res.cloudinary.com/dxhl6umss/image/upload/v1763660196/logo-1_gou8qf.png" alt="Travel-Yatra" style="max-width:150px; height:auto;" />
          <h1 style="color:#fff; margin:15px 0 0 0; font-size:24px;">New Booking Received</h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px;">
          <p style="color:#333; font-size:16px; margin:0 0 20px 0;">
            <strong>A new booking has been submitted!</strong>
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold; width:30%;">Name:</td>
              <td style="padding:12px 0; color:#333;">${booking.name || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Email:</td>
              <td style="padding:12px 0; color:#333;">${booking.email || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Phone:</td>
              <td style="padding:12px 0; color:#333;">${booking.phone || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Package:</td>
              <td style="padding:12px 0; color:#333;">${booking.package || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Travel Date:</td>
              <td style="padding:12px 0; color:#333;">${booking.date || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Adults:</td>
              <td style="padding:12px 0; color:#333;">${booking.adults || '0'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Children:</td>
              <td style="padding:12px 0; color:#333;">${booking.children || '0'}</td>
            </tr>
            <tr>
              <td style="padding:12px 0; color:#666; font-weight:bold;">Message:</td>
              <td style="padding:12px 0; color:#333;">${booking.message || 'No additional message'}</td>
            </tr>
          </table>

          <div style="background:#f8f9fa; padding:15px; border-left:4px solid #0d6efd; margin:20px 0;">
            <p style="color:#666; margin:0; font-size:14px;">
              <strong>Next Steps:</strong> Please reach out to the customer to confirm the booking details.
            </p>
          </div>

          <p style="color:#999; font-size:12px; margin-top:25px;">
            This is an automated email notification. Please do not reply to this email.
          </p>
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

      console.log("📧 Sending booking email via SMTP to:", adminEmail);
      
      // ✅ Send admin email in BACKGROUND (non-blocking - no await)
      sendEmail({
        to: [adminEmail, 'travelyatra98@gmail.com'].join(', '),
        subject: `New Booking: ${booking.name} - ${booking.package}`,
        text: `New booking received from ${booking.name} (${booking.email})`,
        html: html,
      })
        .then((result) => {
          if (result && result.success) {
            console.log("✅ Booking email sent successfully to:", adminEmail, "and travelyatra98@gmail.com");
          } else {
            console.error("❌ SMTP send failed:", result?.error || 'unknown error');
          }
        })
        .catch((err) => {
          console.error("❌ Error sending admin email:", err.message);
        });
    } catch (emailError) {
      // Log error but don't fail the booking response
      console.error("⚠️ Exception while setting up booking email:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Booking saved successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ✅ NEW ROUTE: Send booking notification email via SendGrid
app.post("/api/send-booking-email", async (req, res) => {
  try {
    const { booking } = req.body;
    
    if (!booking) {
      return res.status(400).json({ success: false, message: "Missing booking data" });
    }

    // Build email HTML
    const html = `<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif;">
  <body style="background: #f4f6f8; margin:0; padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <tr style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);">
        <td style="padding:30px; text-align:center;">
          <img src="https://res.cloudinary.com/dxhl6umss/image/upload/v1763660196/logo-1_gou8qf.png" alt="Travel-Yatra" style="max-width:150px; height:auto;" />
          <h1 style="color:#fff; margin:15px 0 0 0; font-size:24px;">🎉 New Lead Received</h1>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:30px;">
          <p style="color:#333; font-size:16px; margin:0 0 20px 0;">
            <strong>A new booking has been submitted!</strong>
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold; width:30%;">Name:</td>
              <td style="padding:12px 0; color:#333;">${booking.name || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Email:</td>
              <td style="padding:12px 0; color:#333;">${booking.email || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Phone:</td>
              <td style="padding:12px 0; color:#333;">${booking.phone || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Package:</td>
              <td style="padding:12px 0; color:#333;">${booking.package || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Travel Date:</td>
              <td style="padding:12px 0; color:#333;">${booking.date || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Adults:</td>
              <td style="padding:12px 0; color:#333;">${booking.adults || '0'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding:12px 0; color:#666; font-weight:bold;">Children:</td>
              <td style="padding:12px 0; color:#333;">${booking.children || '0'}</td>
            </tr>
            <tr>
              <td style="padding:12px 0; color:#666; font-weight:bold;">Message:</td>
              <td style="padding:12px 0; color:#333;">${booking.message || 'No additional message'}</td>
            </tr>
          </table>

          <div style="background:#f8f9fa; padding:15px; border-left:4px solid #0d6efd; margin:20px 0;">
            <p style="color:#666; margin:0; font-size:14px;">
              <strong>Next Steps:</strong> Please reach out to the customer to confirm the booking details.
            </p>
          </div>

          <p style="color:#999; font-size:12px; margin-top:25px;">
            This is an automated email notification. Please do not reply to this email.
          </p>
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

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    
    const emailResult = await sendEmail({
      to: adminEmail,
      subject: `New Booking: ${booking.name} - ${booking.package}`,
      text: `New booking received from ${booking.name} (${booking.email})`,
      html: html,
    });

    if (emailResult && emailResult.success) {
      console.log("✅ Booking notification email sent to:", adminEmail);
      return res.json({ success: true, message: "Email notification sent" });
    }

    console.error("❌ Failed to send booking email:", emailResult?.error || 'unknown error');
    return res.status(500).json({ success: false, message: "Failed to send email" });

  } catch (error) {
    console.error("Error in send-booking-email:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ PUT /api/packages/:id - Edit package (auth protected)
app.put("/api/packages/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid package ID" });
    }

    const {
      title,
      description,
      priceMin,
      priceMax,
      duration,
      imageUrl,
      location,
      person,
    } = req.body;

    const updatedPackage = await Package.findByIdAndUpdate(
      id,
      {
        title,
        description,
        priceMin,
        priceMax,
        duration,
        imageUrl,
        location,
        person,
      },
      { new: true, runValidators: true }
    );

    if (!updatedPackage) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.json({
      success: true,
      message: "Package updated successfully",
      data: updatedPackage,
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ DELETE /api/bookings/:id - Delete booking (auth protected)
app.delete("/api/bookings/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const deletedBooking = await Booking.findByIdAndDelete(id);

    if (!deletedBooking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({
      success: true,
      message: "Booking deleted successfully",
      data: deletedBooking,
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ DELETE /api/packages/:id - Delete package (auth protected)
app.delete("/api/packages/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid package ID" });
    }

    const deletedPackage = await Package.findByIdAndDelete(id);

    if (!deletedPackage) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.json({
      success: true,
      message: "Package deleted successfully",
      data: deletedPackage,
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


const port = process.env.PORT || 6060;

// Start server first (listen for requests)
const server = app.listen(port, () => {
  console.log(`✅ app running on port ${port}`);
  
  // Connect to DB asynchronously (don't block server startup)
  Connection().catch(err => {
    console.error("❌ DB connection error (non-blocking):", err.message);
  });
});
