import express from "express";
import { sendOTPforgot, VerifyForgotOTP } from "../controllers/Mailcontroller.js";

const Mailrouter = express.Router();


// send otp for forgot password 
Mailrouter.post("/send-otp", sendOTPforgot);
Mailrouter.post("/verify-otp", VerifyForgotOTP);

export default Mailrouter;