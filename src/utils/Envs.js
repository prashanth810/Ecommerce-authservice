import dotenv from "dotenv";


dotenv.config();

const env = process.env;

const Envs = {
    PORT: env.PORT,
    MONGO_URL: env.MONGO_URL,

    // jwt secreat 
    JWT_SECRET: env.JWT_SECRET,

    // node mailer 
    USER_MAIL: env.USER_MAIL,
    APP_PASS: env.APP_PASS,
    PORT_NUMBER: env.PORT_NUMBER,
    HOST_NUMBER: env.HOST_NUMBER,

    // cloudinary info 
    CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,

    // grpc
    GRPC_PORT: env.GRPC_PORT || 3005,
    INTERNAL_GRPC_KEY: env.INTERNAL_GRPC_KEY || "ecommerce_grpc_internal_secret_key_2026",
};

export default Envs;