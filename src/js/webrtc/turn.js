class Turn {
  _url = "https://api.filesync.app/credentials/";

  _decodeJwt(token) {
    const payload = token.split(".")[1];
    const json = atob(payload);
    return JSON.parse(json);
  }

  getToken = async () => {
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
    return { username: payload.username, credential: payload.credential};
  };
}