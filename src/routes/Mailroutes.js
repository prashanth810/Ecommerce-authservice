import express from "express";
import { changepassword, sendOTPforgot, VerifyForgotOTP } from "../controllers/Mailcontroller.js";
import Ratelimit from "../middlewares/Ratelimit.js";
import Authmiddleware from "../middlewares/Authmiddleware.js";

const Mailrouter = express.Router();


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