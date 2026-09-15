const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });
require("dotenv").config();
const { cleanEnv, str, port } = require("envalid");

// console.log(process.env);
module.exports = cleanEnv(process.env, {
  NODE_ENV: str({ default: "development" }),
  PORT: port({ default: 5000 }),

  DB_HOST: str(),
  DB_PORT: port(),
  DB_USER: str(),
  DB_PASSWORD: str({ default: "" }),
  DB_NAME: str(),
  DB_SSL: str({ default: "false" }),
  DB_SSL_CA: str({ default: "" }),

  JWT_SECRET: str(),

  JWT_ACCESS_EXPIRES_IN: str({ default: "30m" }),

  REFRESH_JWT_SECRET: str({ default: "" }),

  REFRESH_TOKEN_EXPIRES_IN: str({ default: "7d" }),

  COOKIE_SECURE: str({ default: "false" }),

  COOKIE_SAME_SITE: str({ default: "lax" }),
  
  CUSTOMER_JWT_SECRET: str(),

  CLIENT_URL: str(),

  INITIAL_ADMIN_SETUP_KEY: str({ default: "" }),
});