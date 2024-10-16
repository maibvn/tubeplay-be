// server/config/index.js
const passport = require("passport");
require("./passport"); // Import the passport configuration

const initConfig = (app) => {
  app.use(passport.initialize());
  app.use(passport.session());
};

module.exports = initConfig;
