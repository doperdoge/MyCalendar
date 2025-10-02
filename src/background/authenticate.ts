import { Token } from "@/shared/types";
async function setAuthToken({ Token }: { Token?: Token }) {
  return await chrome.storage.local.set({ Token });
}
async function getAuthToken(): Promise<{ Token?: Token }> {
  let existing = await chrome.storage.local.get<{ Token?: Token }>("Token");
  if (existing.Token !== undefined) {
    // check that it's not expired before returning it
    if (existing.Token.timestamp + existing.Token.expires_in > Date.now()) {
      // it isn't expired, so return the existing token
      return existing;
    } else {
      // it has expired
      // so clear it first
      await setAuthToken({ Token: undefined });
      return { Token: undefined };
    }
  } else {
    // it doesn't exist in the first place
    return { Token: undefined };
  }
}

function extractAccessToken(redirectUri: string) {
  let m = redirectUri.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get("access_token");
}

export async function authenticate(
  interactive = false,
  reply: (token: { Token?: Token }) => {}
) {
  // check to see whether already authenticated
  // TODO - maybe get a refresh token to avoid re-auth every hour
  let existing = await getAuthToken();
  console.log("existing: ", existing);
  if (existing.Token !== undefined) {
    console.log("already authenticated");
    reply(existing);
    return;
  }

  // not authenticated, so perform authentication
  const USERINFO_URL = "https://www.googleapis.com/oauth2/v1/userinfo?alt=json";
  const REDIRECT_URL = chrome.identity.getRedirectURL();
  const CLIENT_ID =
    "918429099018-uuu8l2gfl2gbs8rvv6hjgjm7c4kj489f.apps.googleusercontent.com";
  const SCOPES = ["https://www.googleapis.com/auth/calendar", "email"];
  const AUTH_URL = `https://accounts.google.com/o/oauth2/auth\
?client_id=${CLIENT_ID}\
&response_type=token\
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}\
&scope=${encodeURIComponent(SCOPES.join(" "))}`;

  let authURL = `${AUTH_URL}${interactive ? "" : "&prompt=none"}`;
  console.log("backend is USING AUTH_URL: ", authURL);
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

  // instead of replying, we store the auth token in local storage
  // but first, fetch user info
  if (result) {
    console.log("backend is using auth token:", result);
    let response = await fetch(USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${result}`,
        "Content-Type": "application/json",
      },
    });
    let userInfo = await response.json();
    if (response.status !== 200) {
      console.log("error getting user info");
      console.log(response);
      console.log(userInfo);
      reply({ Token: undefined });
      return;
    } else {
      console.log(userInfo);
      console.log("and we have email", userInfo.email);
      let token = {
        Token: {
          access_token: result,
          email: userInfo.email,
          timestamp: Date.now(),
          expires_in: 3600 * 1000,
        },
      };
      await setAuthToken(token);
      reply(token);
    }
  } else {
    reply({ Token: undefined });
  }
}
