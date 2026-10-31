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

// ─── In-memory store for pending registrations (OTP + user data) ─────────────
// Structure: email -> { otp, expiresAt, userData }
// OTP is valid for 10 minutes; entry is deleted after successful verification.
const pendingRegistrations = new Map();

// ─── Send OTP for NEW USER registration ──────────────────────────────────────
const sendRegisterOTP = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Validate inputs
        if (!name || name.trim() === "") {
            return res.status(400).json({ success: false, message: "Name is required !!!" });
        }
        if (!email || email.trim() === "") {
            return res.status(400).json({ success: false, message: "Email is required !!!" });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Provide valid email !!!" });
        }
        if (!password || password.trim() === "") {
            return res.status(400).json({ success: false, message: "Password is required !!!" });
        }
        if (!validator.isStrongPassword(password, {
            minLength: 8, minLowercase: 1, minUppercase: 1, minSymbols: 1, minNumbers: 1,
        })) {
            return res.status(400).json({ success: false, message: "Provide a strong password !!!" });
        }
        if (!role || role.trim() === "") {
            return res.status(400).json({ success: false, message: "Role is required !!!" });
        }
        if (!["user", "admin", "vendor", "delivery"].includes(role)) {
            return res.status(400).json({ success: false, message: "Provide a valid role !!!" });
        }

        // Check if user already exists in DB
        const existing = await UserModel.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: "User already exists with this email !!!" });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Hash password now so we never store plain text, even temporarily
        const salt = await bcrypt.genSalt(10);
        const hashpassword = await bcrypt.hash(password, salt);

        // Store pending registration in memory
        pendingRegistrations.set(email.trim().toLowerCase(), {
            otp,
            expiresAt,
            userData: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: hashpassword,
                role,
                is_active: true,
            },
        });

        // Send OTP email
        await Mailmodel.sendMail({
            from: Envs.USER_MAIL,
            to: email.trim(),
            subject: "Your Registration OTP — Freshies",
            html: Sendotp({ otp }),
        });

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email. Please verify to complete registration !!!",
        });
    } catch (error) {
        console.error("sendRegisterOTP error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to send OTP. Please try again later." });
    }
};

// ─── Verify OTP and create the user account ──────────────────────────────────
const verifyRegisterOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required !!!" });
        }

        const key = email.trim().toLowerCase();
        const pending = pendingRegistrations.get(key);

        if (!pending) {
            return res.status(400).json({
                success: false,
                message: "No pending registration found. Please request a new OTP !!!",
            });
        }

        // Check expiry
        if (Date.now() > pending.expiresAt) {
            pendingRegistrations.delete(key);
            return res.status(400).json({ success: false, message: "OTP has expired. Please register again !!!" });
        }

        // Validate OTP
        if (pending.otp !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: "Invalid OTP !!!" });
        }

        // Double-check email hasn't been registered between send and verify
        const existing = await UserModel.findOne({ email: key });
        if (existing) {
            pendingRegistrations.delete(key);
            return res.status(400).json({ success: false, message: "User already exists with this email !!!" });
        }

        // Create the user account
        const user = await UserModel.create(pending.userData);

        // Clean up pending entry
        pendingRegistrations.delete(key);

        const token = CreateToken(user);
        const newuser = user.toObject();
        delete newuser.password;

        return res.status(201).json({
            success: true,
            message: "Account created successfully !!!",
            data: newuser,
            token,
        });
    } catch (error) {
        console.error("verifyRegisterOTP error:", error.message);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};

// ─── Send OTP for forgot password (user / admin / vendor / delivery) ─────────
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

// ─── Verify OTP for forgot password ──────────────────────────────────────────
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

// ─── Change password after OTP verified ─────────────────────────────────────
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

export { sendRegisterOTP, verifyRegisterOTP, sendOTPforgot, VerifyForgotOTP, changepassword };
