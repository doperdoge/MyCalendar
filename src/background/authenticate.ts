function extractAccessToken(redirectUri: string) {
  let m = redirectUri.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get("access_token");
}

export async function authenticate(interactive = false, reply: any) {
  const REDIRECT_URL = chrome.identity.getRedirectURL();
  const CLIENT_ID =
    "918429099018-uuu8l2gfl2gbs8rvv6hjgjm7c4kj489f.apps.googleusercontent.com";
  const SCOPES = ["https://www.googleapis.com/auth/calendar"];
  const AUTH_URL = `https://accounts.google.com/o/oauth2/auth\
?client_id=${CLIENT_ID}\
&response_type=token\
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}\
&scope=${encodeURIComponent(SCOPES.join(" "))}`;

  let authURL = `${AUTH_URL}${interactive ? "" : "&prompt=none"}`;
  console.log("backend is USING AUTH_URL: ", AUTH_URL);
  let result = await chrome.identity
    .launchWebAuthFlow({
      interactive: true,
      url: authURL,
    })
    .then((redirect_url) => {
      console.log("backend got redirect url ", redirect_url);
      if (redirect_url) {
        let token = extractAccessToken(redirect_url);
        return token;
      }
      return null;
    })
    .catch((err) => console.log("error launching auth flow: ", err))
    .finally(() => console.log("launching auth flow finished"));

  reply(result);
}
