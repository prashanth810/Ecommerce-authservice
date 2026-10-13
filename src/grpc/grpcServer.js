import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import UserModel from "../models/UserModel.js";
import Envs from "../utils/Envs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const authProto = grpc.loadPackageDefinition(
    protoLoader.loadSync(path.join(__dirname, "./auth.proto"), {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    })
).auth;

const isAllowed = (call) => {
    const key = call?.metadata?.get("x-internal-key")?.[0];
    return Boolean(key && key === Envs.INTERNAL_GRPC_KEY);
};

const GetUserById = async (call, callback) => {
    if (!isAllowed(call)) {
        return callback({ code: grpc.status.UNAUTHENTICATED, message: "Not allowed" });
    }

    try {
        const { userId } = call.request;

        if (!mongoose.isValidObjectId(userId)) {
            return callback(null, { success: false, message: "User not found", data: null });
        }

        const user = await UserModel.findById(userId).lean();

        if (!user) {
            return callback(null, { success: false, message: "User not found", data: null });
        }

        return callback(null, {
            success: true,
            message: "User found",
            data: {
                id: String(user._id),
                username: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                role: user.role || "user",
            },
        });
    } catch (error) {
        return callback({ code: grpc.status.INTERNAL, message: error.message });
    }
};

const startGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(authProto.AuthService.service, { GetUserById });

    server.bindAsync(`0.0.0.0:${Envs.GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (error) => {
        if (error) {
            console.error("Auth gRPC failed to start:", error.message);
            return;
        }
        console.log(`Auth gRPC server running on ${Envs.GRPC_PORT}`);
    });
};

export default startGrpcServer;
