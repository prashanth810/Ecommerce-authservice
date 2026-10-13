import express from "express";
import { Vendoreregister, vendorlogin } from "../controllers/Vendorcontroller.js";

const Vendorroute = express.Router();

// vendore register
Vendorroute.post("/vendor/register", Vendoreregister);

// vendor login 
Vendorroute.post("/vendor/login", vendorlogin);



export default Vendorroute;