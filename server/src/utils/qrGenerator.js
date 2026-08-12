const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const generateQRCode = async (tableNumber, qrToken) => {

    const uploadDir = path.join(process.cwd(), "uploads", "qr");

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const frontendURL = process.env.CLIENT_URL || "http://localhost:5173";

    const qrUrl = `${frontendURL}/table/${qrToken}`;

    const fileName = `table-${tableNumber}.png`;

    const filePath = path.join(uploadDir, fileName);

    await QRCode.toFile(filePath, qrUrl, {
        width: 800,
        margin: 2,
        errorCorrectionLevel: "H"
    });

    return {
        qrUrl,
        qrImage: `uploads/qr/${fileName}`
    };
};

module.exports = generateQRCode;