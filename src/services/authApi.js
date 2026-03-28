const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
const AUTH_TOKEN_KEY = "cura_auth_token";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeHostname(value) {
  return String(value || "").trim().toLowerCase();
}

function isLoopbackHost(value) {
  return LOOPBACK_HOSTS.has(normalizeHostname(value));
}

function getBrowserHostname() {
  if (typeof window === "undefined") {
    return "";
  }
  return normalizeHostname(window.location?.hostname);
}

function isLikelyNetworkError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("network request failed")
    || message.includes("fetch failed")
    || message.includes("load failed");
}

function getFriendlyUnavailableMessage() {
  const browserHost = getBrowserHostname();
  const configuredOnLoopback = /:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|::1)(?::|\/|$)/i.test(API_BASE_URL);
  if (configuredOnLoopback && browserHost && !isLoopbackHost(browserHost)) {
    return "Impossible de joindre le serveur. Si vous testez sur telephone, remplacez localhost par l'IP locale du PC dans REACT_APP_API_BASE_URL.";
  }
  return "Impossible de joindre le serveur pour le moment. Verifiez que le backend est demarre et que REACT_APP_API_BASE_URL est correct.";
}

function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (_error) {
    return null;
  }
}

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function buildCandidateBaseUrls() {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/$/, "");
  if (!normalizedBaseUrl) {
    return [];
  }

  const variants = [];
  const pushVariant = (value) => {
    if (value && !variants.includes(value)) {
      variants.push(value);
    }
  };

  pushVariant(normalizedBaseUrl);

  try {
    const parsed = new URL(normalizedBaseUrl);
    const isLocalhost = isLoopbackHost(parsed.hostname);
    if (isLocalhost) {
      const hostCandidates = [normalizeHostname(parsed.hostname)];
      const browserHost = getBrowserHostname();
      if (browserHost && !isLoopbackHost(browserHost) && !hostCandidates.includes(browserHost)) {
        hostCandidates.push(browserHost);
      }

      hostCandidates.forEach((hostname) => {
        const hostBaseUrl = new URL(parsed.toString());
        hostBaseUrl.hostname = hostname;
        pushVariant(hostBaseUrl.toString().replace(/\/$/, ""));

        ["8091", parsed.port, "8090", "8081", "8080"].forEach((port) => {
          if (!port) return;
          const alternateUrl = new URL(hostBaseUrl.toString());
          alternateUrl.port = port;
          pushVariant(alternateUrl.toString().replace(/\/$/, ""));
        });

        if (!parsed.port) {
          ["8091", "8090", "8081", "8080"].forEach((port) => {
            const alternateUrl = new URL(hostBaseUrl.toString());
            alternateUrl.port = port;
            pushVariant(alternateUrl.toString().replace(/\/$/, ""));
          });
        }
      });
    }
  } catch (_error) {
    // Ignore malformed custom base URLs and keep the configured value only.
  }

  return variants.flatMap((baseUrl) => (
    /\/curafamilia-auth$/i.test(baseUrl)
      ? [baseUrl]
      : [baseUrl, `${baseUrl}/curafamilia-auth`]
  )).filter((value, index, array) => array.indexOf(value) === index);
}

async function request(path, body) {
  if (!API_BASE_URL) {
    throw new Error("Configuration API manquante. Ajoutez REACT_APP_API_BASE_URL dans le front.");
  }

  const candidateBaseUrls = buildCandidateBaseUrls();

  let lastNetworkError = null;

  for (let i = 0; i < candidateBaseUrls.length; i += 1) {
    const candidateBaseUrl = candidateBaseUrls[i];
    const isLastCandidate = i === candidateBaseUrls.length - 1;
    let response;

    try {
      response = await fetch(`${candidateBaseUrl}${path}`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastNetworkError = error;
      if (!isLastCandidate) {
        continue;
      }
      if (isLikelyNetworkError(error)) {
        throw new Error(getFriendlyUnavailableMessage());
      }
      throw error;
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return data;
    }

    if (response.status === 404 && !isLastCandidate) {
      continue;
    }

    const isServerError = response.status >= 500 && response.status <= 504;
    if (isServerError && !isLastCandidate) {
      continue;
    }

    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(getFriendlyUnavailableMessage());
    }

    throw new Error(data?.message || `HTTP ${response.status} ${response.statusText}`);
  }

  if (lastNetworkError) {
    if (isLikelyNetworkError(lastNetworkError)) {
      throw new Error(getFriendlyUnavailableMessage());
    }
    throw lastNetworkError;
  }

  throw new Error("Une erreur serveur est survenue.");
}

export async function loginAuth(payload) {
  return request("/auth/login", payload);
}

export async function registerAuth(payload) {
  return request("/auth/register", payload);
}

export async function forgotPasswordAuth(payload) {
  return request("/auth/forgot-password", payload);
}
