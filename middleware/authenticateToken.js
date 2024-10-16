const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Assuming the User model is located here

// Middleware to authenticate and attach user info to the request
const authenticateToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
  // if (!token) return res.status(401).json({ error: "No token provided" });
  if (!token) {
    return next();
  }
  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user information from the database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Attach user information to the request object
    req.user = user;
    // Proceed to the next middleware or route
    next();
  } catch (error) {
    console.log("Error verifying token");
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      // Ignore invalid tokens; just call next()
      return next();
    }

    res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = { authenticateToken };
