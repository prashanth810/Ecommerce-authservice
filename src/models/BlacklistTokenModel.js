import mongoose from "mongoose";

const BlacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // Automatically deletes after 24 hours (1 day)
    }
});

const BlacklistTokenModel = mongoose.model("BlacklistToken", BlacklistTokenSchema);

export default BlacklistTokenModel;
