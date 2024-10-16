const ytdl = require("@distube/ytdl-core");

exports.uploadToDropbox = async (songs, uniqueId, req, res) => {
  const dbx = req.dbx;
  // console.log(req.sesion.user);
  const uploadMultipleSongs = async (url, dropboxPath, thumbnail) => {
    const fileName = dropboxPath.split("/").pop();

    try {
      // List files in the folder to check for existence
      const folderPath = dropboxPath.substring(0, dropboxPath.lastIndexOf("/"));
      const response = await dbx.filesListFolder({ path: folderPath });

      // Check if any file has the same name
      const fileExists = response.result.entries.some(
        (entry) => entry.name === fileName
      );

      if (fileExists) {
        // console.log(`${fileName} already exists.`);

        try {
          // Try to retrieve the existing shared link (if it exists)
          const sharedLinkListResponse = await dbx.sharingListSharedLinks({
            path: `${folderPath}/${fileName}`,
            direct_only: true, // Ensures we only get direct links, not folder links
          });

          if (sharedLinkListResponse.result.links.length > 0) {
            // Return the first existing shared link
            const existingLink = sharedLinkListResponse.result.links[0].url;
            return {
              title: fileName,
              ytUrl: url,
              dropboxUrl: existingLink.replace("?dl=0", "?dl=1"), // Ensure it's a direct download link
              thumbnail: thumbnail,
            };
          }

          // If no shared link exists, create a new one
          const sharedLinkResponse =
            await dbx.sharingCreateSharedLinkWithSettings({
              path: `${folderPath}/${fileName}`,
            });

          // Return the new permanent shared link
          return {
            title: fileName,
            ytUrl: url,
            dropboxUrl: sharedLinkResponse.result.url.replace("?dl=0", "?dl=1"),
            thumbnail: thumbnail,
          };
        } catch (error) {
          console.error("Error fetching or creating shared link:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("Error checking existing files:", error);
      return;
    }
    console.log(fileName, dropboxPath);

    return new Promise((resolve, reject) => {
      const ytdlStream = ytdl(url, { filter: "audioonly" });
      const chunks = [];

      ytdlStream.on("data", (chunk) => {
        chunks.push(chunk); // Collect chunks of data
      });

      ytdlStream.on("end", async () => {
        const buffer = Buffer.concat(chunks); // Concatenate the chunks into a single buffer

        try {
          // Upload the buffer to Dropbox
          const uploadResponse = await dbx.filesUpload({
            path: dropboxPath,
            contents: buffer,
            mode: { ".tag": "add" },
          });

          // console.log(`File uploaded to Dropbox at: ${dropboxPath}`);

          // Create a shared link for the newly uploaded file
          const sharedLinkResponse =
            await dbx.sharingCreateSharedLinkWithSettings({
              path: uploadResponse.result.path_lower,
            });

          // Return the shared link
          resolve({
            title: fileName,
            ytUrl: url,
            dropboxUrl: sharedLinkResponse.result.url.replace("?dl=0", "?dl=1"),
            thumbnail: thumbnail,
          });
        } catch (error) {
          console.error("Error uploading to Dropbox:", error);
          res
            .status(500)
            .json({ status: "error", message: "Failed to upload file." });
          reject(error);
        }
      });

      ytdlStream.on("error", (err) => {
        console.error("Error downloading audio:", err);
        reject(err);
      });
    });
  };

  // Loop through each song and upload it, collecting the result in an array
  const songUploads = await Promise.all(
    songs.map(async (song) => {
      let dropboxPath = `/registerdUsers/${song.title}.mp3`;
      if (!req.user && !req.session.user) {
        dropboxPath = `/temp/${uniqueId}-${song.title}.mp3`;
      }
      const result = await uploadMultipleSongs(
        song.ytUrl,
        dropboxPath,
        song.bestThumbnail
      );
      return result;
    })
  );

  return songUploads;
};
