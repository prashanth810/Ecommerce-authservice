import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    profile_pic: {
        type: String,
        default: "",
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
    },
    date_of_birth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: {
            values: ["male", "female", "other"],
            message: "Gender must be male, female or other.",
        },
    },
    is_active: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: {
            values: ["user", "admin", "delivery", "vendor"],
            message: "Role must be user, admin, vendor or delivery person.",
        },
        default: "user",
    },
    // forgot-password OTP (without these, mongoose strict mode silently drops otp on save)
    otp: {
        type: String,
        default: null,
        select: false,
    },
    otpexpiresat: {
        type: Date,
        default: null,
        select: false,
    },
    store_name: {
        type: String,
        required: function () {
            return this.role === "vendor";
        },
        trim: true,
    },
    Bussiness_category: {
        type: String,
        required: function () {
            return this.role === "vendor";
        },
        trim: true,
    },

}, { timestamps: true, minimize: false })


const UserModel = mongoose.model("User", UserSchema);

export default UserModel;