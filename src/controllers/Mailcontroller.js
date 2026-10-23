import CreateToken from "../helperfunctions/CreateToken.js";
import Sendotp from "../htmlfiles/Sendotp.js";
import Mailmodel from "../models/Mailmodel.js";
import UserModel from "../models/UserModel.js";
import Envs from "../utils/Envs.js";
import crypto from "crypto";
import validator from "validator";
import bcrypt from "bcrypt";
import BlacklistTokenModel from "../models/BlacklistTokenModel.js";

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

        const user = await UserModel.findOne({ email: email.trim().toLowerCase(), role });
        if (!user) {
            return res.status(404).json({ success: false, message: `No ${role} account found with this email !!!` });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        user.otp = otp;
        user.otpexpiresat = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await user.save({ validateModifiedOnly: true });

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

        // otp fields are select:false in the schema, so they must be requested explicitly
        const user = await UserModel
            .findOne({ email: email.trim().toLowerCase(), role })
            .select("+otp +otpexpiresat");

        if (!user) {
            return res.status(404).json({ success: false, message: `No ${role} account found with this email !!!` });
        }

        if (!user.otp || !user.otpexpiresat) {
            return res.status(400).json({ success: false, message: "No OTP requested. Please request a new OTP !!!" });
        }

        if (user.otpexpiresat < new Date()) {
            user.otp = null;
            user.otpexpiresat = null;
            await user.save({ validateModifiedOnly: true });
            return res.status(400).json({ success: false, message: "OTP has expired !!!" });
        }

        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: "Invalid OTP !!!" });
        }

        user.otp = null;
        user.otpexpiresat = null;
        await user.save({ validateModifiedOnly: true });

        const token = CreateToken(user);

        return res.status(200).json({ success: true, message: "OTP verified successfully !!!", token });
    }
    catch (error) {
        console.error("VerifyForgotOTP error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};

// change password after OTP verified
const changepassword = async (req, res) => {
    const { password, currentPassword } = req.body;

    try {
        if (!password || password.trim() === "") {
            return res.status(400).json({ success: false, message: "Password is required !!!" });
        }

        if (!validator.isStrongPassword(password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minSymbols: 1,
            minNumbers: 1,
        })) {
            return res.status(400).json({ success: false, message: "Provide the strong password !!!" });
        }

        const user = await UserModel.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        // settings flow: verify the current password
        if (currentPassword) {
            const validCurrent = await bcrypt.compare(currentPassword, user.password);
            if (!validCurrent) {
                return res.status(400).json({ success: false, message: "Current password is incorrect !!!" });
            }
        }

        const samePassword = await bcrypt.compare(password, user.password);
        if (samePassword) {
            return res.status(400).json({ success: false, message: "New password cannot be the same as the previous password !!!" });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save({ validateModifiedOnly: true });

        // token can be used only once
        const token = req.headers.authorization?.split(" ")[1];
        if (token) await BlacklistTokenModel.create({ token }).catch(() => { });

        return res.status(200).json({ success: true, message: "Password changed successfully, please login !!!" });
    }
    catch (error) {
        console.error("changepassword error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};

export { sendOTPforgot, VerifyForgotOTP, changepassword };