import jwt from "jsonwebtoken";
import Envs from "../utils/Envs.js";

const CreateToken = (user) => {
    return jwt.sign({
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
    }, Envs.JWT_SECRET, { expiresIn: "1d" })
}

export default CreateToken;