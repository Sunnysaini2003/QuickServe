import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";

export const uploadToCloudinary = (
    buffer,
    folder,
    publicId = undefined,
) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                ...(publicId ? { public_id: publicId } : {}),
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            },
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};