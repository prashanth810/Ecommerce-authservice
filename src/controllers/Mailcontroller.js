import CreateToken from "../helperfunctions/CreateToken.js";
import Sendotp from "../htmlfiles/Sendotp.js";
import Mailmodel from "../models/Mailmodel.js";
import UserModel from "../models/UserModel.js";
import Envs from "../utils/Envs.js";
import crypto from "crypto";
import validator from "validator";


const ALLOWED_ROLES = ["user", "admin", "vendor", "delivery"];

// send otp for forgot password (user / admin / vendor / delivery)
const sendOTPforgot = async (req, res) => {
    const { email, role } = req.body;
    try {
        if (!email || email.trim() === "") {
            return res.status(400).json({ success: false, message: "Email is required !!!" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Provide the valid email !!!" });
        }
        if (!role || role.trim() === "") {
            return res.status(400).json({ success: false, message: "Role is required !!!" });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: "Provide the valid role !!!" });
        }

        // the email must belong to an account with this role
        const user = await UserModel.findOne({ email: email.trim().toLowerCase(), role });
        if (!user) {
            return res.status(404).json({ success: false, message: `No ${role} account found with this email !!!` });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        user.otp = otp;
        user.otpexpiresat = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await user.save({ validateModifiedOnly: true });

        // sent to the email of the matched account
        await Mailmodel.sendMail({
            from: Envs.USER_MAIL,
            to: user.email,
            subject: "Your forgot password OTP",
            html: Sendotp({ otp }),
        });

        return res.status(200).json({ success: true, message: "OTP sent to your mail, check your inbox !!!" });
    }
    catch (error) {
        console.error("sendOTPforgot error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to send OTP right now. Please try again later." });
    }
};


// verify otp for forgot password
const VerifyForgotOTP = async (req, res) => {
    const { email, role, otp } = req.body;
    try {
        if (!email || !role || !otp) {
            return res.status(400).json({ success: false, message: "Email, role and OTP are required !!!" });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ success: false, message: "Provide the valid role !!!" });
        }

        const user = await UserModel.findOne({ email: email.trim().toLowerCase(), role });
        if (!user) {
            return res.status(404).json({ success: false, message: `No ${role} account found with this email !!!` });
        }

        if (!user.otp || user.otp !== String(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP !!!" });
        }

        if (user.otpexpiresat < new Date()) {
            return res.status(400).json({ success: false, message: "OTP has expired !!!" });
        }

        user.otp = null;
        user.otpexpiresat = null;
        await user.save({ validateModifiedOnly: true });

        const token = await CreateToken(user);

        return res.status(200).json({ success: true, message: "OTP verified successfully !!!", token });
    }
    catch (error) {
        console.error("VerifyForgotOTP error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};

export { sendOTPforgot, VerifyForgotOTP };