import express from 'express';
import connection from "./database/connecDb.js";
import Booking from './schema/clientSchema.js';
import Otp from './schema/otpSchema.js';
import axios from 'axios';
import cors from "cors";
const app = express();
app.use(express.json());
app.use(cors());

connection();
app.get('/', (req, res) => {
    res.send('server running')
})

app.post("/send-otp", async (req, res) => {
    try {
        const { phone } = req.body;

        const generatedOtp = 1234;
        console.log("generated-otp",generatedOtp);

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