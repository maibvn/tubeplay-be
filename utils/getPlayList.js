const ytpl = require("ytpl"); // Ensure you have this dependency

exports.getPlaylistUrl = async function (playlistUrl) {
  try {
    // Fetch playlist details
    const playlist = await ytpl(playlistUrl);

    const songs = playlist.items.map((item) => {
      return {
        title: item.title,
        ytUrl: item.shortUrl,
        bestThumbnail: item.bestThumbnail,
        duration: item.duration, // Get the duration of the song
      };
    });

    // Calculate total duration in seconds
    const totalDurationInSeconds = playlist.items.reduce((total, item) => {
      const durationParts = item.duration.split(":").map(Number); // Split duration into parts
      const durationInSeconds =
        durationParts.length === 2
          ? durationParts[0] * 60 + durationParts[1] // Convert minutes to seconds
          : durationParts[0]; // If it's just seconds

      return total + durationInSeconds; // Accumulate total duration
    }, 0);
    // Format total duration (HH:MM:SS)
    const totalDurationFormatted = new Date(totalDurationInSeconds * 1000)
      .toISOString()
      .substr(11, 8);

    const playlistInfo = {
      plTitle: playlist.title,
      plUrl: playlist.url,
      plSongNum: playlist.estimatedItemCount,
      songs: songs,
      totalDuration: totalDurationFormatted, // Add formatted duration to the info
    };

    return { playlistInfo };
  } catch (error) {
    console.error("Error fetching playlist:", error);
    throw error; // Optional: rethrow to handle it in the caller
  }
};
