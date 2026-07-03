export function getNotionRedirectUri() {
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!redirectUri) {
    throw new Error("NOTION_REDIRECT_URI is missing in .env");
  }

  return redirectUri;
}

export function getNotionAuthUrl(state: string) {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error("NOTION_CLIENT_ID is missing in .env");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getNotionRedirectUri(),
    response_type: "code",
    owner: "user",
    state,
  });

  return `https://app.notion.com/install-integration?${params.toString()}`;
}

export function getNotionBasicAuthHeader() {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();
const clientSecret = process.env.NOTION_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("NOTION_CLIENT_ID or NOTION_CLIENT_SECRET is missing in .env");
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}