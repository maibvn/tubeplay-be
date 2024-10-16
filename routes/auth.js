const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const passport = require("passport");
const User = require("../models/user");
const { signupUser, loginUser, logoutUser } = require("../controllers/auth");

const router = express.Router();

// Register a new user
router.post("/signup", signupUser);

// Login user
router.post("/login", loginUser);

// Login user
router.post("/logout", logoutUser);

const verifyGoogleToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload; // Contains user info (email, name, etc.)
};

router.post("/google", async (req, res) => {
  const { token } = req.body;
  try {
    // Verify the Google ID token
    const userData = await verifyGoogleToken(token);

    // Check if user already exists in the database
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      // Create a new user if not found
      user = new User({
        name: userData.name,
        email: userData.email,
        googleId: userData.sub, // 'sub' is the unique Google ID
        // playlists: [],
      });
      await user.save();
    }

    // Save user data to session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      // playlists: [],
    };

    // Respond to the frontend with user info or a session token
    res
      .status(200)
      .json({ message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error("Error verifying Google ID token:", err);
    res.status(401).json({ message: "Invalid Google ID token" });
  }
});

// Route to check if the user is still logged in (session check)
router.get("/checkauth", (req, res) => {
  if (req.user) {
    const userEmail = req.user.email;
    return res.status(200).json({
      message: "Authenticated via token",
      mode: "token",
      email: userEmail,
    });
  }

  // If no token, check if user is authenticated via session
  if (req.session && req.session.user) {
    const sessionUser = req.session.user;
    return res.status(200).json({
      message: "Authenticated via session",
      mode: "session",
      user: sessionUser,
    });
  }

  // If neither token nor session authentication is present, respond with Unauthorized
  return res
    .status(401)
    .json({ message: "Unauthorized: User not authenticated" });
});

module.exports = router;
