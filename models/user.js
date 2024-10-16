const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    // unique: true,
  },
  name: {
    type: String,
    // required: true,
  },
  password: {
    type: String,
    required: function () {
      // Password is required only if the user is not using Google Auth
      return !this.googleId;
    },
  },
  googleId: {
    type: String, // For users authenticated via Google
    unique: true,
    sparse: true, // Allows this field to be optional
  },
  playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: "Playlist" }], // References Playlist
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


const User = mongoose.model("User", userSchema);

module.exports = User;
