import validator from "validator";
import bcrypt from "bcrypt";
import UserModel from "../models/UserModel.js";
import CreateToken from "../helperfunctions/CreateToken.js";

// vendore register
const Vendoreregister = async (req, res) => {
    const { name, store_name, Bussiness_category, email, password, role } = req.body;
    try {

        const vendor = await UserModel.findOne({ email });

        if (vendor) {
            return res.status(404).json({ success: false, message: "Vendor allredy exit !!!" });
        }

        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required !!!" });
        }

        if (!role) {
            return res.status(400).json({ success: false, message: "Role is required !!!" })
        }

        if (!["vendor"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role !!!" })
        }

        if (!store_name) {
            return res.status(400).json({ success: false, message: "Store name is required !!!" });
        }

        if (!Bussiness_category) {
            return res.status(400).json({ success: false, message: "Bussiness category is required !!!" });
        }

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required !!!" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format !!!" });
        }

        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required !!!" });
        }

        if (!validator.isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: "Password is not strong enough !!!" })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedpassword = await bcrypt.hash(password, salt);

        const vendoracc = await UserModel.create({
            name,
            store_name,
            Bussiness_category,
            email,
            role,
            is_active: true,
            password: hashedpassword
        })

        const token = CreateToken(vendoracc);

        const newvendor = vendoracc.toObject();
        delete newvendor.password;

        return res.status(201).json({
            success: true, message: "Vendor register successfullly !!!",
            data: newvendor,
            token,
        })
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}


// vendor login 
const vendorlogin = async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const vendor = await UserModel.findOne({ email });

        if (!vendor) {
            return res.status(404).json({ success: false, message: "Invalid creadiantials !!!" });
        }

        if (!email || email.trim() === "") {
            return res.status(400).json({ success: false, message: "Email is required !!!" });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email formate !!!" });
        }

        if (!password || password.trim() === "") {
            return res.status(400).json({ success: false, message: "Password is required !!!" });
        }

        if (!role) {
            return res.status(400).json({ success: false, message: "Role is required !!!" });
        }

        if (!["vendor"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role !!!" });
        }

        // const passwordcompare 
        const passcompare = await bcrypt.compare(password, vendor.password);

        if (!passcompare) {
            return res.status(400).json({ success: false, message: "Invalid creadiantials !!!" })
        }

        const token = CreateToken(vendor);

        const newvendor = vendor.toObject();
        delete newvendor.password;

        return res.status(200).json({
            success: true, message: "Vendor login successfullly !!!",
            data: newvendor,
            token,
        })
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}


export { Vendoreregister, vendorlogin };