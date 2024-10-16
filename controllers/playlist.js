const { getPlaylistUrl } = require("../utils/getPlayList");
const { uploadToDropbox } = require("../utils/uploadToDropbox");
const User = require("../models/user");
const Playlist = require("../models/playlist");
const { v4: uuidv4 } = require("uuid");
const { cleanSongTitles } = require("../utils/cleanSongTitles");

function sanitizeDropboxPath(fileName) {
  // Preserve /temp/ and /registeredUsers/ while removing invalid characters
  const sanitizedPath = fileName
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
    .trim() // Trim whitespace from start and end
    .replace(/^[.]+|[.]$/g, ""); // Trim periods from start and end

  // Handle case where the path becomes empty
  return sanitizedPath === "" ? "untitled" : sanitizedPath;
}

// Helper to handle user playlist logic
const handleUserPlaylist = async (playlistInfo) => {
  const existingPlaylist = await Playlist.findOne({
    plUrl: playlistInfo.plUrl,
  });
  if (existingPlaylist) return existingPlaylist._id;

  const newPlaylist = new Playlist({
    plTitle: playlistInfo.plTitle,
    plUrl: playlistInfo.plUrl,
    plSongNum: playlistInfo.plSongNum,
    songs: playlistInfo.songs,
    totalDuration: playlistInfo.totalDuration,
  });

  await newPlaylist.save();

  return newPlaylist._id;
};

exports.generatePlaylist = async (req, res, next) => {
  // Check for the playlist URL in the request
  const playlistUrl = req.query.plUrl;
  if (!playlistUrl) {
    return res.status(400).json({
      message: "Bad Request: playlistUrl is required",
      userEmail: req.user?.email || req.session?.user?.email || null,
    });
  }

  // Generate unique ID for unregistered users (no req.user or req.session.user)
  const uniqueId = req.user || req.session.user ? null : "123";

  try {
    // Fetch playlist information from the provided URL
    const { playlistInfo } = await getPlaylistUrl(playlistUrl);
    playlistInfo.songs = playlistInfo.songs.map((song) => ({
      ...song, // Spread the existing properties
      title: sanitizeDropboxPath(song.title), // Sanitize the title
    }));

    // Upload songs to Dropbox
    const results = await uploadToDropbox(
      playlistInfo.songs,
      uniqueId,
      req,
      res
    );

    // Update the Dropbox URLs for each song
    const updatedSongs = results.map((song) => ({
      ...song,
      dropboxUrl: song.dropboxUrl.replace(/dl=0$/, "dl=1"),
    }));

    playlistInfo.songs = updatedSongs;

    // Handle playlist creation or lookup for authenticated users
    let user = req.user || req.session.user; // Check both JWT and session for the user
    let playlistId = null;

    if (user) {
      playlistId = await handleUserPlaylist(playlistInfo);
      // Find the user by their ID
      const userDb = await User.findById(user.id);

      if (!userDb) {
        console.error("User not found");
        return null; // Or handle the error as needed
      }
      // Only push the new playlist ID if it's not already in the user's playlists

      if (!userDb.playlists.includes(playlistId)) {
        userDb.playlists.push(playlistId);
        await userDb.save(); // Save the updated user
      }
    }

    // Clean song titles (remove prefixes, etc.)
    const cleanedSongs = cleanSongTitles(playlistInfo.songs, uniqueId);
    playlistInfo.songs = cleanedSongs;

    // Respond with the playlist data
    res.status(200).json({
      playlistId,
      playlistInfo,
      nonRegisterUserId: uniqueId,
    });
  } catch (err) {
    console.error("Error processing playlist:", err);
    res.status(500).json({ message: "Error processing playlist", error: err });
  }
};

exports.getSinglePlaylist = async (req, res) => {
  // Check for authentication via session or JWT
  const authenticatedUser = req.user || req.session.user;

  if (!authenticatedUser) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User not authenticated" });
  }

  const { playlistId } = req.params;
  try {
    // Find the playlist by its ID
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Clean song titles by removing ".mp3" suffix
    const cleanedTitleSongs = playlist.songs.map((s) =>
      s.title.replace(/\.mp3$/, "")
    );

    playlist.songs = playlist.songs.map((s, i) => ({
      ...s,
      title: cleanedTitleSongs[i],
    }));

    // Return the playlist
    res.status(200).json(playlist);
  } catch (error) {
    console.error("Error fetching playlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTempSongs = async (req, res) => {
  const dbx = req.dbx;
  const { unregUserId } = req.params;

  try {
    const response = await dbx.filesListFolder({ path: "/temp" });
    const files = await Promise.all(
      response.result.entries.map(async (entry) => {
        if (
          entry[".tag"] === "file" &&
          entry.name.endsWith(".mp3") &&
          entry.name.includes(unregUserId)
        ) {
          try {
            const sharedLinkResponse = await dbx.sharingListSharedLinks({
              path: entry.path_lower,
              direct_only: true,
            });
            let sharedLink =
              sharedLinkResponse.result.links.length > 0
                ? sharedLinkResponse.result.links[0].url.replace(
                    "dl=0",
                    "raw=1"
                  )
                : (
                    await dbx.sharingCreateSharedLinkWithSettings({
                      path: entry.path_lower,
                    })
                  ).result.url.replace("dl=0", "raw=1");

            return {
              title: entry.name,
              dropboxUrl: sharedLink,
            };
          } catch {
            return null; // Handle any errors by returning null
          }
        }
        return null; // Skip non-MP3 files or those without unregUserId in the title
      })
    );
    const cleanedTitleSongs = files.map((s) =>
      s.title
        .replace(new RegExp(`^${unregUserId}-`), "") // Remove the prefix + suffix
        .replace(/\.mp3$/, "")
    );

    res.json({
      plTitle: "Your Playlist 💕",
      songs: files.filter(Boolean).map((s, i) => ({
        ...s,
        title: cleanedTitleSongs[i],
      })),
    });
  } catch {
    res.status(500).json({ error: "Error listing files" });
  }
};

exports.getAllPlaylists = async (req, res) => {
  const user = req.session.user || req.user;

  // if (!req.user) {
  //   return res
  //     .status(401)
  //     .json({ message: "Unauthorized: User not authenticated" });
  // }

  const userEmail = req.user.email ? req.user.email : req.session.email; // Get the user's email from the request

  try {
    // Find the user by email
    const user = await User.findOne({ email: userEmail }).populate("playlists"); // Populate playlists

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return all playlists associated with the user
    res.status(200).json(user.playlists);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Endpoint to add a like to a playlist
exports.addLikeToPlaylist = async (req, res) => {
  const playlistId = req.params.id;

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $inc: { likes: 1 } }, // Increment the likes by 1
      { new: true } // Return the updated document
    );

    if (!updatedPlaylist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    res.status(200).json({ message: "Like added!", playlist: updatedPlaylist });
  } catch (error) {
    console.error("Error adding like to playlist:", error);
    res.status(500).json({ error: "Could not add like" });
  }
};
