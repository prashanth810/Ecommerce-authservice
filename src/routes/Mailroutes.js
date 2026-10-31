import express from "express";
import { changepassword, sendOTPforgot, VerifyForgotOTP, sendRegisterOTP, verifyRegisterOTP } from "../controllers/Mailcontroller.js";
import Ratelimit from "../middlewares/Ratelimit.js";
import Authmiddleware from "../middlewares/Authmiddleware.js";

const Mailrouter = express.Router();

// ─── Registration OTP flow ───────────────────────────────────────────────────

// Step 1: User fills form → send OTP to email
Mailrouter.post("/register/send-otp", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), sendRegisterOTP);

// Step 2: User enters 6-digit OTP → verify and create account
Mailrouter.post("/register/verify-otp", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), verifyRegisterOTP);

// ─── Forgot password OTP flow ────────────────────────────────────────────────

// send otp for forgot password 
Mailrouter.post("/send-otp", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), sendOTPforgot);

Mailrouter.post("/verify-otp", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), VerifyForgotOTP);

// change password using the token from verify-otp
Mailrouter.patch("/change-password", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), Authmiddleware, changepassword);


export default Mailrouter;
