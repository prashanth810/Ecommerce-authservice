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

// update my profile data 
const Updatemyprofile = async (req, res) => {

    const { name } = req.body || {};

    try {

        const user = req.user;

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found !!!"
            });
        }

        const updateprofile = {};


        // Update name only if it is provided
        if (name !== undefined) {

            if (typeof name !== "string" || name.trim() === "") {
                return res.status(400).json({
                    success: false,
                    message: "Name cannot be empty !!!"
                });
            }

            updateprofile.name = name.trim();
        }

        // IMPORTANT: upload.single() → req.file
        const file = req.file;

        if (file) {

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            const maxSize = 5 * 1024 * 1024;

            // Validate image type
            if (!allowedTypes.includes(file.mimetype)) {

                return res.status(400).json({
                    success: false,
                    message: "Only jpg, jpeg, png, webp, gif formats are allowed!"
                });
            }

            // Validate image size
            if (file.size > maxSize) {

                return res.status(400).json({
                    success: false,
                    message: "Image size must be less than 5MB!"
                });
            }

            // Upload new image first
            const secureUrl = await uploadToCloudinary(
                file.buffer,
                "users/profile_pic"
            );

            updateprofile.profile_pic = secureUrl;

            /*
             Delete old image AFTER successful upload.
             This is safer.
            */

            if (user.profile_pic) {

                try {

                    const urlParts = user.profile_pic.split("/");

                    // Example:
                    // users/profile_pic/abc123.jpg

                    const uploadIndex =
                        urlParts.indexOf("upload");

                    const pathAfterVersion =
                        urlParts.slice(uploadIndex + 2);

                    const fullPath =
                        pathAfterVersion.join("/");

                    const public_id =
                        fullPath.substring(
                            0,
                            fullPath.lastIndexOf(".")
                        );


                    await cloudinary.uploader.destroy(
                        public_id
                    );

                } catch (deleteErr) {

                    console.warn(
                        "Old image deletion failed:",
                        deleteErr.message
                    );

                }

            }

        }


        // Nothing to update
        if (Object.keys(updateprofile).length === 0) {

            return res.status(400).json({
                success: false,
                message: "Please provide a name or profile picture!"
            });

        }


        // Update ONLY logged-in user's profile
        const updatedUser =
            await UserModel.findByIdAndUpdate(

                user._id,

                {
                    $set: updateprofile
                },

                {
                    new: true,
                    runValidators: true
                }

            ).select("-password");


        return res.status(200).json({

            success: true,

            message: "Profile updated successfully!",

            user: updatedUser

        });

    }

    catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};


// delete my profile 
const Deleteaccount = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await UserModel.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User Not found !!!" });
        }

        // Delete profile picture from Cloudinary
        if (user.profile_pic) {

            try {

                // Get public_id from Cloudinary URL
                const urlParts = user.profile_pic.split("/");

                const uploadIndex = urlParts.indexOf("upload");

                // Remove version part
                const pathAfterVersion = urlParts.slice(uploadIndex + 2);

                // Join remaining path
                const fullPath = pathAfterVersion.join("/");

                // Remove extension
                const public_id = fullPath.substring(
                    0,
                    fullPath.lastIndexOf(".")
                );

                await cloudinary.uploader.destroy(
                    public_id
                );

            } catch (deleteError) {

                console.warn(
                    "Cloudinary image deletion failed:",
                    deleteError.message
                );

            }

        }


        // Delete user from MongoDB
        await UserModel.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "Acccount deleted success !!!" });


    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

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


// forgot password
// const Forgotpassword = async (req, res) => {
//     const { email } = req.body;
//     try {
//         const user = await UserModel.findOne({ email });

//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found !!!" });
//         }

//         if (!email || email.trim() === "") {
//             return res.status(400).json({ success: false, message: "Email is required !!!" })
//         }

//         if (!validator.isEmail(email)) {
//             return res.status(400).json({ success: false, message: "Invalid email id !!!" })
//         }

//         // generate otp
//         const otp = Math.floor(100000 + Math.random() * 900000).toString();

//         // OTP expires after 5 minutes
//         const expiresAt = Date.now() + 1 * 60 * 1000;

//         // Store OTP
//         otpStore.set(email, {
//             otp,
//             expiresAt,
//         });

//         // Send OTP
//         await sendOTP(email, otp);

//         return res.status(200).json({
//             success: true,
//             message: "OTP sent successfully to your email !!!",
//         });


//     }
//     catch (error) {
//         return res.status(500).json({ success: false, message: error.message });
//     }
// }

// const VerifyForgotOTP = async (req, res) => {
//     const { email, otp } = req.body;

//     try {
//         const storedOTP = otpStore.get(email);

//         if (!storedOTP) {
//             return res.status(400).json({
//                 success: false,
//                 message: "OTP expired or not found !!!",
//             });
//         }

//         if (Date.now() > storedOTP.expiresAt) {
//             otpStore.delete(email);

//             return res.status(400).json({
//                 success: false,
//                 message: "OTP has expired !!!",
//             });
//         }

//         if (storedOTP.otp !== otp) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid OTP !!!",
//             });
//         }

//         // OTP is correct
//         otpStore.delete(email);

//         return res.status(200).json({
//             success: true,
//             message: "OTP verified successfully !!!",
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };

export { Regiterapi, Loginapi, myprofile, singleprofiledata, Updatemyprofile, Deleteaccount, DeactivateInactiveUsers, Logout };