import express from "express";
import { upload } from "../config/Cloudinary.js";
import Authmiddleware from "../middlewares/Authmiddleware.js";
import { DeactivateInactiveUsers, Deleteaccount, Loginapi, myprofile, Regiterapi, singleprofiledata, Updatemyprofile, Logout } from "../controllers/Usercontroller.js";
import Ratelimit from "../middlewares/Ratelimit.js";

const Authrouter = express.Router();

// register and login woth post 
Authrouter.post("/register", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), upload.single("profile_pic"), Regiterapi);

Authrouter.post("/login",
    Ratelimit(
        60 * 1000,      // 1 minute window
        5,              // 5 attempts
        5 * 60 * 1000   // 5 minute cooldown
    ),
    Loginapi
);

// het apis my profile info
Authrouter.get("/myprofile", Ratelimit(
    60 * 1000,      // 1 minute window
    10,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), Authmiddleware, myprofile);

// get single user info
Authrouter.get("/profile/:id", Ratelimit(
    60 * 1000,      // 1 minute window
    20,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), Authmiddleware, singleprofiledata);

// update my profile data 
Authrouter.put("/profile/:id", Ratelimit(
    60 * 1000,      // 1 minute window
    15,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), Authmiddleware, upload.single("profile_pic"), Updatemyprofile)


// delete account delete
Authrouter.delete("/account/:id", Ratelimit(
    60 * 1000,      // 1 minute window
    2,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), Authmiddleware, Deleteaccount);


// in active account with patch after 3 months
Authrouter.patch("/inactive-users", Ratelimit(
    60 * 1000,      // 1 minute window
    5,              // 5 attempts
    5 * 60 * 1000   // 5 minute cooldown
), DeactivateInactiveUsers);

Authrouter.post("/logout", Authmiddleware, Logout);


export default Authrouter;