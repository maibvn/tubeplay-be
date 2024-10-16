const express = require("express");
const router = express.Router();
const playlistController = require("../controllers/playlist");

// Route to generate a playlist
router.get("/generate", playlistController.generatePlaylist);

router.get("/playlists", playlistController.getAllPlaylists);

// Route to handle playlist for nonres users
router.get("/temp/:unregUserId", playlistController.getTempSongs);

// Route to get a playlist
router.get("/:playlistId", playlistController.getSinglePlaylist);

router.get("/like-playlist/:id", playlistController.addLikeToPlaylist);

module.exports = router;
