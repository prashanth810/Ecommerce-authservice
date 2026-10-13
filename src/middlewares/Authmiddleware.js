import jwt from "jsonwebtoken";
import Envs from "../utils/Envs.js";
import UserModel from "../models/UserModel.js";
import BlacklistTokenModel from "../models/BlacklistTokenModel.js";

const Authmiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
        }

        // Check if token has been blacklisted (logged out)
        const isBlacklisted = await BlacklistTokenModel.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Session expired or logged out. Please log in again."
            });
        }

        const decode = jwt.verify(token, Envs.JWT_SECRET);

        const user = await UserModel.findById(decode.id).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found !!!" });
        }

        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: error.message });
    }
}

export default Authmiddleware;