// Helper to clean song titles
exports.cleanSongTitles = (songs, uniqueId) => {
  return songs.map((s) => ({
    ...s,
    title: s.title
      .replace(new RegExp(`^${uniqueId}-`), "")
      .replace(/\.mp3$/, ""),
  }));
};
