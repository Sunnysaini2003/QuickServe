const QRCode = require("qrcode");
const cloudinary = require("../config/cloudinary");

const generateQRCode = async (tableNumber, qrToken) => {
    const frontendURL =
        process.env.CLIENT_URL || "http://localhost:5173";

    const qrUrl =
        `${frontendURL}/?table=${encodeURIComponent(qrToken)}`;

    const sanitizedTableNumber = String(tableNumber)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "-");

    const publicId = `table-${sanitizedTableNumber}`;

    const qrBuffer = await QRCode.toBuffer(qrUrl, {
        width: 800,
        margin: 2,
        errorCorrectionLevel: "H",
        type: "png"
    });

    const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "quickserve/qr",
                public_id: publicId,
                resource_type: "image",
                overwrite: true
            },
            (error, uploaded) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(uploaded);
            }
        );

        uploadStream.end(qrBuffer);
    });

    return {
        qrUrl,
        qrImage: result.secure_url,
        qrPublicId: result.public_id
    };
};

module.exports = generateQRCode;