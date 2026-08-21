const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================================================
// CREATE UPLOAD MIDDLEWARE
// ============================================================

const createImageUpload = (folder, prefix) => {

    const uploadDir = path.join(
        process.cwd(),
        "uploads",
        folder
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
            recursive: true
        });
    }

    // --------------------------------------------------------
    // STORAGE
    // --------------------------------------------------------

    const storage = multer.diskStorage({

        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },

        filename: (req, file, cb) => {

            const extension = path
                .extname(file.originalname)
                .toLowerCase();

            const uniqueName =
                `${prefix}-${Date.now()}-${Math.round(
                    Math.random() * 1E9
                )}${extension}`;

            cb(null, uniqueName);
        }

    });

    // --------------------------------------------------------
    // FILE FILTER
    // --------------------------------------------------------

    const fileFilter = (req, file, cb) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, PNG and WebP images are allowed"
                ),
                false
            );
        }

    };

    // --------------------------------------------------------
    // MULTER
    // --------------------------------------------------------

    return multer({

        storage,

        fileFilter,

        limits: {
            fileSize: 2 * 1024 * 1024
        }

    });

};


// ============================================================
// UPLOAD INSTANCES
// ============================================================

const uploadUserImage = createImageUpload(
    "users",
    "user"
);

const uploadCategoryImage = createImageUpload(
    "categories",
    "category"
);


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    uploadUserImage,
    uploadCategoryImage
};