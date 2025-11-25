import express from 'express';
import connection from "./database/connecDb.js";
import Booking from './schema/clientSchema.js';
import Package from './schema/packageSchema.js';
import Otp from './schema/otpSchema.js';
import axios from 'axios';
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
  })
);

connection();
app.get('/', (req, res) => {
    res.send('server running')
})

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,          
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
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

app.get("/get-packages", async (req, res) => {
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
        const html = `
            <h1>Your OTP is for package enquiry: <b>${generatedOtp}</b></h1>
            <p>This otp is valid for 5 minutes.</p>
        `;
        const emailSent = await sendMail(email,"Trip Enquiry Verification OTP",html)
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
        const { phone } = req.body;

        // check if otp exists (means valid)
        const otpRecord = await Otp.findOne({ phone });

        if (otpRecord) {
            return res.json({
                success: false,
                message: "OTP not verified",
            });
        }

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