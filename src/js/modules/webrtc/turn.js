class Turn {
  _url = "https://api.filesync.app/credentials/";
  _expiration = null;
  _username = null;
  _credential = null;

  _decodeJwt(token) {
    const payload = token.split(".")[1];
    const json = atob(payload);
    return JSON.parse(json);
  }

  getToken = async () => {
    const now = Math.floor(Date.now() / 1000);

    // Check if token is still valid
    if (this._expiration !== null && this._expiration > now) {
      return { username: this._username, credential: this._credential };
    }

    // Fetch new token
    const response = await fetch(this._url, { method: "GET" });

    if (!response.ok) {
      throw new Error("An issue occurred while getting the token.");
    }

    // Parse the response as JSON
    const data = await response.json();

    // Get JWT from cookie
    const token = data.token
    if (!token) throw new Error("Token cookie not found");

    // Decode JWT to get username and credential
    const payload = this._decodeJwt(token);

    // Set cached values
    this._expiration = payload.exp - 10; // Subtract 10 seconds for safety
    this._username = payload.username;
    this._credential = payload.credential;

    // Return the username and credential
    return { username: this._username, credential: this._credential };
  };
}

export const turn = new Turn();