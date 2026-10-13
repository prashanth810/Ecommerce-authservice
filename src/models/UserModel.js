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
    store_name: {
        type: String,
        required: true,
        trim: true,
    },
    Bussiness_category: {
        type: String,
        required: true,
        trim: true,
    },

}, { timestamps: true, minimize: false })


const UserModel = mongoose.model("User", UserSchema);

export default UserModel;