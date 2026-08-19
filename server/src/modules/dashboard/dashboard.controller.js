const dashboardService = require("./dashboard.service");

const getDashboard = async (req, res, next) => {

    try {

        const period =
            req.query.period || "Today";

        const dashboard =
            await dashboardService.getDashboard(period);

        res.status(200).json({

            success: true,

            message:
                "Dashboard retrieved successfully",

            data: dashboard

        });

    } catch (error) {

        next(error);

    }
};

module.exports = {
    getDashboard
};