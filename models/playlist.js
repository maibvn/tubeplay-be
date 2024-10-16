const mongoose = require("mongoose");

// Playlist Schema
const playlistSchema = new mongoose.Schema({
  plTitle: {
    type: String,
    required: true,
  },
  plUrl: {
    type: String,
    required: true,
  },
  plSongNum: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  totalDuration: {
    type: String,
    default: "00:00:00",
  },
  songs: [
    {
      title: {
        type: String,
        required: true,
      },
      ytUrl: {
        type: String,
        required: true,
      },
      dropboxUrl: {
        type: String,
        required: true,
      },
      thumbnail: {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
        },
      },
    },
  ],
});

const Playlist = mongoose.model("Playlist", playlistSchema);

module.exports = Playlist;
