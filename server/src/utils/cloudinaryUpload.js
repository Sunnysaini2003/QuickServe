const { Readable } = require("stream");
const cloudinary = require("../config/cloudinary");

const ensureCloudinaryConfigured = () => {
    const required = [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET"
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length) {
        throw new Error(
            `Cloudinary is not configured. Missing environment variables: ${missing.join(", ")}`
        );
    }
};

const uploadBufferToCloudinary = (buffer, options = {}) => {
    ensureCloudinaryConfigured();

    if (!Buffer.isBuffer(buffer) || !buffer.length) {
        return Promise.reject(new Error("Image buffer is empty"));
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "image",
                ...options
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }
        );

        Readable.from(buffer).pipe(uploadStream);
    });
};

module.exports = {
    uploadBufferToCloudinary,
    ensureCloudinaryConfigured
};