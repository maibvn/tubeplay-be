// const express = require("express");
// const { authenticateToken } = require("../middleware/authenticateToken"); // Import the middleware
// const router = express.Router();

// // Define a route to get user details
// router.get("/api/user", authenticateToken, (req, res) => {
//   if (req.user) {
//     // Token was valid, user is authenticated
//     res.json({ userEmail: req.user.email });
//   } else {
//     // Token not provided or invalid, process without user data
//     res.json({ message: "No user authenticated, but proceeding." });
//   }
// });

// module.exports = router;
