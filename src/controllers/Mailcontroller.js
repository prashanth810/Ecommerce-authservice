import CreateToken from "../helperfunctions/CreateToken.js";
import Sendotp from "../htmlfiles/Sendotp.js";
import Mailmodel from "../models/Mailmodel.js";
import UserModel from "../models/UserModel.js";
import Envs from "../utils/Envs.js";


// send otp for forgot password
const sendOTPforgot = async (req, res) => {
    const { email } = req.body;
    try {
        let user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const otpexpiresAt = new Date(Date.now() + 1 * 60 * 1000);

        user.otp = otp;
        user.otpexpiresat = otpexpiresAt;

        await user.save();

        const result = await Mailmodel.sendMail({
            from: Envs.USER_MAIL,
            to: email,
            subject: "Your forget password otp recieved",
            html: Sendotp(otp),
        })

        return res.status(200).json({ success: true, message: "OTP Sent to your mail check inbox !!!" });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}


// verify otp for forgot password 
const VerifyForgotOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP !!!" });
        }

        if (user.otpexpiresat < new Date()) {
            return res.status(400).json({ success: false, message: "OTP has expired !!!" });
        }

        user.otp = null;
        user.otpexpiresat = null;
        await user.save();

        const token = await CreateToken(user);

        return res.status(200).json({ success: true, message: "OTP verified successfully !!!", token });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

export { sendOTPforgot, VerifyForgotOTP };