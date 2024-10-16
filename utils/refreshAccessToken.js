const axios = require("axios");
const { Dropbox } = require("dropbox");

// Function to get a new access token using the refresh token
async function getAccessTokenFromRefreshToken(refreshToken) {
  const tokenUrl = "https://api.dropboxapi.com/oauth2/token";

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", process.env.DROPBOX_CLIENT_ID);
  params.append("client_secret", process.env.DROPBOX_CLIENT_SECRET);

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const { access_token } = response.data;
    return { access_token };
  } catch (error) {
    console.error("Error fetching new access token:", error.response.data);
    throw error;
  }
}

// Example usage
async function initializeDropbox() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN; // Your stored refresh token

  try {
    const data = await getAccessTokenFromRefreshToken(refreshToken);

    const { access_token } = data;

    // Initialize Dropbox with the new access token
    const dbx = new Dropbox({
      accessToken: access_token,
      fetch: fetch,
    });
    return dbx; // Now you can use the Dropbox client
  } catch (error) {
    console.error("Failed to initialize Dropbox client:", error);
  }
}

// Call the function to initialize Dropbox
// initializeDropbox();
module.exports = initializeDropbox;
