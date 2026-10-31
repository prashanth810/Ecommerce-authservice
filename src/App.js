import express from "express";
import cors from "cors";
import morgan from "morgan";
import Envs from "./utils/Envs.js";
import ConnectionDB from "./config/ConnectionDB.js";
import Authrouter from "./routes/Userroutes.js";
import Mailrouter from "./routes/Mailroutes.js";
import Vendorroute from "./routes/Vendorroutes.js";
import startGrpcServer from "./grpc/grpcServer.js";
import healthRouter from "./health/health.routes.js";

const app = express();

const PORT = Envs.PORT;

const corsOptions = {
    origin: (origin, callback) => {
        // Allow all origins (reflection) while supporting credentials
        callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Authorization"],
};

app.use(cors(corsOptions));
app.use(morgan("dev"));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
    res.status(200).json({ success: true, message: "Auth service is running properly !!!" });
});


// connecging all roues 
app.use("/api/auth/v1", Authrouter);

// mail routes 
app.use("/api/auth/mail", Mailrouter);

// vendor routes
app.use("/api/auth/v1", Vendorroute);

app.use("/health", healthRouter); // HEALTH (before all other routes)

ConnectionDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Auth service is running on port ${PORT}`);
    });
    startGrpcServer();
}).catch((error) => {
    console.log("error starting the server", error)
    process.exit(1);
})