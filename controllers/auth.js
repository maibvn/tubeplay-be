const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");
// const crypto = require("crypto");

const User = require("../models/user");

// // Set up the Nodemailer transporter (using Gmail)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "your-email@gmail.com", // Replace with your Gmail address
//     pass: "your-email-password", // Replace with your Gmail password (or app-specific password)
//   },
// });
// // Function to generate a random verification code
// const generateVerificationCode = () => {
//   return crypto.randomInt(100000, 999999).toString(); // Generates a 6-digit code
// };

// Register a new user
exports.signupUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ isExisted: true }); // Email already exists
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Error registering user" });
  }
};

// exports.signupUser = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Check if the user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(409).json({ isExisted: true }); // Email already exists
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Generate a verification code
//     const verificationCode = generateVerificationCode();

//     // Create a new user with the verification code
//     const newUser = new User({
//       email,
//       password: hashedPassword,
//       verificationCode, // Store the verification code with the user
//       isVerified: false, // Mark the user as not verified yet
//     });
//     await newUser.save();

//     // Send the verification email
//     const mailOptions = {
//       from: "your-email@gmail.com",
//       to: email,
//       subject: "Email Verification",
//       text: `Welcome to Tubeplay! Your verification code is ${verificationCode}`,
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.error("Error sending verification email:", error);
//         return res
//           .status(500)
//           .json({ error: "Error sending verification email" });
//       } else {
//         console.log("Verification email sent:", info.response);
//         res.status(201).json({
//           message:
//             "User registered successfully! Please check your email to verify your account.",
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error registering user:", error);
//     res.status(500).json({ error: "Error registering user" });
//   }
// };

// Login user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Create a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Error logging in" });
  }
};

// Logout user
exports.logoutUser = async (req, res) => {
  if (req.session.user) {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Error logging out" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    res.status(200).json({ message: "No active session to log out" });
  }
};
