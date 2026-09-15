const jwt = require("jsonwebtoken");
const env = require("../config/env");

const getRefreshSecret = () =>
  env.REFRESH_JWT_SECRET || `${env.JWT_SECRET}:refresh`;

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshSecret());
};

module.exports = {
  generateRefreshToken,
  verifyRefreshToken,
};
