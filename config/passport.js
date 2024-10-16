// server/config/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user"); // Ensure correct path

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(1515, "passpor.js", profile);
        // Check if user already exists in the database
        let user = await User.findOne({ googleId: profile.id });
        console.log(1818, user);
        if (user) {
          done(null, user); // User exists, return user
        } else {
          // Create a new user
          user = await new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
          }).save();

          done(null, user); // Return the newly created user
        }
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize user ID
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user); // Deserialize user
});
