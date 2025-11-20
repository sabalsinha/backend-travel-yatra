import express from 'express';
import connection from "./database/connecDb.js";
import Booking from './schema/clientSchema.js';
import Otp from './schema/otpSchema.js';
import axios from 'axios';
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

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
        const { phone,email } = req.body;

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const html = `
            <h1>Your OTP is: <b>${generatedOtp}</b></h1>
            <p>This OTP is valid for 5 minutes.</p>
        `;
        const emailSent = await sendMail(email,"Trip Enquiry Verification OTP",html)
        if (!emailSent) {
            return res.json({
                success: false,
                message: "Failed to send OTP email"
            });
        }
        // Store OTP
        await Otp.create({ phone, otp: generatedOtp });

        res.json({ success: true, message: "OTP sent successfully" });
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Server error" });
    }
});


app.post("/verify-otp", async (req, res) => {
    try {
        const { phone, otp } = req.body;

        const record = await Otp.findOne({ phone, otp });

        if (!record) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        // OTP is valid → delete OTP so it can't be reused
        await Otp.deleteMany({ phone });

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