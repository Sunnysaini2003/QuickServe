require("dotenv").config();
const { cleanEnv, str, port } = require("envalid");

// console.log(process.env);
module.exports = cleanEnv(process.env, {
  PORT: port({ default: 5000 }),

  DB_HOST: str(),
  DB_PORT: port(),
  DB_USER: str(),
  DB_PASSWORD: str({ default: "" }),
  DB_NAME: str(),

  JWT_SECRET: str(),
  
  CUSTOMER_JWT_SECRET: str(),

  CLIENT_URL: str(),
});