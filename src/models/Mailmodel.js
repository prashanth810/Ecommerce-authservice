import nodemailer from "nodemailer";
import Envs from "../utils/Envs.js";


const Mailmodel = nodemailer.createTransport({
    host: Envs.HOST_NUMBER,
    port: Envs.PORT_NUMBER,
    secure: true,
    auth: {
        user: Envs.USER_MAIL,
        pass: Envs.APP_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
    debug: true, logger: false,
});

export default Mailmodel;