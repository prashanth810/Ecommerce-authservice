import nodemailer from "nodemailer";
import Envs from "../utils/Envs.js";

// clean the values (spaces / quotes / hidden characters in .env break SMTP)
const clean = (v) => (v ?? "").toString().trim().replace(/^["']|["']$/g, "");

const host = clean(Envs.HOST_NUMBER) || "smtp.gmail.com";
const port = Number(clean(Envs.PORT_NUMBER)) || 587;
const user = clean(Envs.USER_MAIL);
const pass = clean(Envs.APP_PASS).replace(/\s+/g, ""); // app password: no spaces

// 465 = implicit TLS (secure:true) | 587 = STARTTLS (secure:false)
const secure = port === 465;

console.log("SMTP config ->", { host, port, secure, user, passLength: pass.length });

const Mailmodel = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    tls: { servername: host },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
});

Mailmodel.verify()
    .then(() => console.log("SMTP ready"))
    .catch((err) => console.error("SMTP verify failed:", err.message));

export default Mailmodel;