import validator from "validator";
import bcrypt from "bcrypt";
import CreateToken from "../helperfunctions/CreateToken.js";
import UserModel from "../models/UserModel.js";
import { cloudinary, uploadToCloudinary } from "../config/Cloudinary.js";
import BlacklistTokenModel from "../models/BlacklistTokenModel.js";


// register new user adding 
const Regiterapi = async (req, res) => {
    const { name, email, password, role, is_active } = req.body;
    try {
        const exist = await UserModel.findOne({ email });

        if (exist) {
            return res.status(400).json({ success: false, message: "User already existed !!!" });
        }

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
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minSymbols: 1,
            minNumbers: 1
        })) {
            return res.status(400).json({ success: false, message: "provide the Strong password !!!" });
        }

        if (!role || role.trim() === "") {
            return res.status(400).json({ success: false, message: "Role is required !!!" });
        }

        if (!['user', 'admin', 'vendor', 'delivery'].includes(role)) {
            return res.status(400).json({ success: false, message: "provide the valid role !!!" });
        }

        let profile_pic = "";

        // Profile picture is optional
        if (req.file) {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];
            const maxSize = 5 * 1024 * 1024; // 5 MB

            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: "Only jpg, jpeg, png, webp, gif formats are allowed for profile picture!"
                });
            }

            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: "Profile picture must be less than 5MB !!!"
                });
            }

            profile_pic = await uploadToCloudinary(
                req.file.buffer,
                "users/profile_pic"
            );
        }

        const salt = await bcrypt.genSalt(10);
        const hashpassword = await bcrypt.hash(password, salt);

        const user = await UserModel.create({
            name: name.trim(),
            email: email.trim(),
            profile_pic,
            password: hashpassword,
            role,
            is_active: is_active !== undefined ? is_active : true,
        });

        const token = CreateToken(user);

        const newuser = user.toObject();
        delete newuser.password;

        return res.status(201).json({
            success: true,
            data: newuser,
            token: token,
            message: "New user created success !!!"
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// login api
const Loginapi = async (req, res) => {
    const { email, password, role } = req.body;
    try {
        if (!email || email.trim() === "") {
            return res.status(400).json({ success: false, message: "Email is required !!!" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Provide the valid email !!!" });
        }

        if (!password || password.trim() === "") {
            return res.status(400).json({ success: false, message: "Password is required !!!" });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password is minimum 8 characters !!!" });
        }

        if (!validator.isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: "Provide the valid password !!!" });
        }

        if (!role || role.trim() === "") {
            return res.status(400).json({ success: false, message: "Role is required !!!" });
        }

        const allowedRoles = ['user', 'admin', 'vendor', 'delivery'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Provide the valid role !!!" });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "user not found !!!" });
        }

        const loginrole = user?.role;

        const comparepass = await bcrypt.compare(password, user.password);
        if (!comparepass) {
            return res.status(400).json({ success: false, message: "Invalid email & password !!!" });
        }

        if (loginrole !== role) {
            return res.status(403).json({ success: false, message: "Role is mismatched !!!" });
        }

        const token = CreateToken(user);

        const loginuser = user.toObject();
        delete loginuser.password;

        return res.status(200).json({
            success: true,
            message: "Login successfull !!!",
            data: loginuser,
            token: token
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// get my profile info
const myprofile = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        return res.status(200).json({ success: true, data: user });

    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// single profile info
const singleprofiledata = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await UserModel.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        return res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}


// keep your existing imports (UserModel, cloudinary, uploadToCloudinary) as they are

const GENDERS = ["male", "female", "other"]; // must match the enum in your UserModel
const PHONE_REGEX = /^(?:\+?91|0)?[6-9]\d{9}$/; // Indian mobile: 10 digits starting 6-9 (+91 / 0 prefix allowed)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });

const Updatemyprofile = async (req, res) => {
    const { name, phone, date_of_birth, gender } = req.body || {};

    try {
        const user = req.user;

        if (!user) {
            return bad(res, "User not found !!!", 404);
        }

        const updateprofile = {};

        // ---------- 1. validate EVERYTHING first (so nothing is uploaded if a field is wrong) ----------

        // name
        if (name !== undefined) {
            if (typeof name !== "string" || name.trim() === "") {
                return bad(res, "Name cannot be empty !!!");
            }
            updateprofile.name = name.trim();
        }

        // phone
        if (phone !== undefined) {
            const cleaned = String(phone).replace(/[\s-]/g, "");
            if (!PHONE_REGEX.test(cleaned)) {
                return bad(res, "Enter a valid 10 digit phone number !!!");
            }
            updateprofile.phone = cleaned.slice(-10); // always store only the 10 digits
        }

        // date of birth (YYYY-MM-DD)
        if (date_of_birth !== undefined) {
            const raw = String(date_of_birth).trim();

            if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                return bad(res, "Date of birth must be in YYYY-MM-DD format !!!");
            }

            const dob = new Date(`${raw}T00:00:00.000Z`);

            // rejects impossible dates like 2000-02-31
            if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== raw) {
                return bad(res, "Enter a valid date of birth !!!");
            }

            const now = new Date();
            if (dob > now) {
                return bad(res, "Date of birth cannot be in the future !!!");
            }

            const oldest = new Date();
            oldest.setUTCFullYear(now.getUTCFullYear() - 120);
            if (dob < oldest) {
                return bad(res, "Enter a valid date of birth !!!");
            }

            updateprofile.date_of_birth = dob;
        }

        // gender
        if (gender !== undefined) {
            const g = typeof gender === "string" ? gender.trim().toLowerCase() : "";
            if (!GENDERS.includes(g)) {
                return bad(res, `Gender must be one of: ${GENDERS.join(", ")} !!!`);
            }
            updateprofile.gender = g;
        }

        // profile picture (upload.single() -> req.file)
        const file = req.file;

        if (file) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                return bad(res, "Only jpg, jpeg, png, webp, gif formats are allowed!");
            }
            if (file.size > MAX_IMAGE_SIZE) {
                return bad(res, "Image size must be less than 5MB!");
            }
        }

        // ---------- 2. nothing sent -> error ----------
        if (Object.keys(updateprofile).length === 0 && !file) {
            return bad(res, "Please provide at least one field to update: name, phone, date_of_birth, gender or profile picture !!!");
        }

        // ---------- 3. upload the new image (only after all the checks passed) ----------
        if (file) {
            updateprofile.profile_pic = await uploadToCloudinary(file.buffer, "users/profile_pic");
        }

        // ---------- 4. update ONLY the logged-in user's profile ----------
        const updatedUser = await UserModel.findByIdAndUpdate(
            user._id,
            { $set: updateprofile },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return bad(res, "User not found !!!", 404);
        }

        // ---------- 5. delete the OLD image only after the DB update succeeded ----------
        if (file && user.profile_pic) {
            try {
                // https://res.cloudinary.com/<cloud>/image/upload/v123/users/profile_pic/abc.jpg
                const urlParts = user.profile_pic.split("/");
                const uploadIndex = urlParts.indexOf("upload");
                const fullPath = urlParts.slice(uploadIndex + 2).join("/"); // users/profile_pic/abc.jpg
                const public_id = fullPath.substring(0, fullPath.lastIndexOf(".")); // users/profile_pic/abc

                await cloudinary.uploader.destroy(public_id);
            } catch (deleteErr) {
                console.warn("Old image deletion failed:", deleteErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            user: updatedUser,
        });
    }
    catch (error) {
        // phone already used by another account (unique index)
        if (error?.code === 11000) {
            return bad(res, "This phone number is already in use !!!", 409);
        }
        // schema validation (enum / required / cast errors)
        if (error?.name === "ValidationError" || error?.name === "CastError") {
            return bad(res, Object.values(error.errors || {})[0]?.message || "Invalid data !!!");
        }

        console.error("Updatemyprofile error:", error.message);
        return bad(res, "Something went wrong. Please try again.", 500);
    }
};


// in active account
const DeactivateInactiveUsers = async (req, res) => {
    try {
        const threeMonthsAgo = new Date();

        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const result = await UserModel.updateMany(
            {
                is_active: true,
                createdAt: { $lt: threeMonthsAgo },
            },
            {
                $set: {
                    is_active: false,
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: "Inactive users deactivated successfully.",
            deactivated_users: result.modifiedCount,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
            error: error.message,
        });
    }
};

// logout 
const Logout = async (req, res) => {
    const { token } = req.body;
    try {
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Token is required for logout."
            });
        }
        // Add token to the blacklist
        await BlacklistTokenModel.create({ token });
        return res.status(200).json({
            success: true,
            message: "Logout successful! Token has been invalidated.",
        });
    } catch (error) {
        // If token was already blacklisted (duplicate key)
        if (error.code === 11000) {
            return res.status(200).json({
                success: true,
                message: "Logout successful!",
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// update password
const updatepassword = async (req, res) => {
    const { currentPassword, password } = req.body;
    try {
        const userId = req.user.id;
        if (!currentPassword || currentPassword.trim() === "") {
            return res.status(400).json({ success: false, message: "Current password is required !!!" });
        }

        if (!password || password.trim() === "") {
            return res.status(400).json({ success: false, message: "New password is required !!!" });
        }

        if (!validator.isStrongPassword(password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minSymbols: 1,
            minNumbers: 1,
        })) {
            return res.status(400).json({ success: false, message: "Please provide stong password !!!" });
        }

        if (currentPassword === password) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password !!!"
            });
        }

        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect !!!" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully !!!"
        });

    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}


// delete my profile 
const Deleteaccount = async (req, res) => {
    const { id } = req.params;
    const { confirm } = req.body || {};

    try {
        // only the owner (or an admin) can delete this account
        if (req.user.id !== id && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not allowed to delete this account !!!" });
        }

        // must be exactly "DELETE"
        if (confirm !== "DELETE") {
            return res.status(400).json({
                success: false,
                message: 'Type "DELETE" to confirm account deletion !!!',
            });
        }

        const user = await UserModel.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        // Delete profile picture from Cloudinary
        if (user.profile_pic) {
            try {
                const urlParts = user.profile_pic.split("/");
                const uploadIndex = urlParts.indexOf("upload");
                const fullPath = urlParts.slice(uploadIndex + 2).join("/");
                const public_id = fullPath.substring(0, fullPath.lastIndexOf("."));

                await cloudinary.uploader.destroy(public_id);
            } catch (deleteError) {
                console.warn("Cloudinary image deletion failed:", deleteError.message);
            }
        }

        await UserModel.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "Account deleted successfully !!!" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { Regiterapi, Loginapi, myprofile, singleprofiledata, Updatemyprofile, Deleteaccount, DeactivateInactiveUsers, Logout, updatepassword };