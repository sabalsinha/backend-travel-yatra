import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import compression from "compression";
import connection from "./database/connecDb.js";
import Booking from './schema/clientSchema.js';
import Package from './schema/packageSchema.js';
import Otp from './schema/otpSchema.js';
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
// import { sendEmail } from './utility/awsMail.js';
// import { sendOtpEmail } from './utility/awsNodemailer.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 min
});


// const emailler = "aniketmailme2011@gmail.com";
// sendOtpEmail(emailler,otp).then(() => {
//     console.log("OTP email sent successfully");
// }).catch((err) => {
//     console.log("Failed to send OTP email", err);
// });
const app = express();
app.use(compression());
app.use(express.json());
// app.use(mongoSanitize());
// app.use(helmet());
app.use(limiter);
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
  })
);

connection();
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
app.get("/health", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ success: true, message: "DB alive ✅" });
  } catch {
    res.status(500).json({ success: false, message: "DB sleeping ❌" });
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
      to: email,
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
    /////////////////////////////////////////////////////////////////
    //working code for otp verification, to be implemeted later

    // const { phone } = req.body;

    // check if otp exists (means valid)
    // const otpRecord = await Otp.findOne({ phone });

    // if (otpRecord) {
    //   return res.json({
    //     success: false,
    //     message: "OTP not verified",
    //   });
    // }

    ///////////////////////////////////////////////////////////////////

    const booking = new Booking(req.body);
    await booking.save();

    res.status(201).json({
      success: true,
      message: "Booking saved successfully",
      data: booking,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


const port = 6060;
app.listen(port, () => {
  console.log(`app running on port ${port}`);
})