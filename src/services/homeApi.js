const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
const AUTH_TOKEN_KEY = "cura_auth_token";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REACT_APP_API_TIMEOUT_MS || "2200", 10);

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
      const browserHost = getBrowserHostname();
      const hostCandidates = [];

      // On phone or LAN access, browser host is usually the correct first candidate.
      if (browserHost && !isLoopbackHost(browserHost)) {
        hostCandidates.push(browserHost);
      }

      const configuredHost = normalizeHostname(parsed.hostname);
      if (!hostCandidates.includes(configuredHost)) {
        hostCandidates.push(configuredHost);
      }

      hostCandidates.forEach((hostname) => {
        const hostBaseUrl = new URL(parsed.toString());
        hostBaseUrl.hostname = hostname;
        pushVariant(hostBaseUrl.toString().replace(/\/$/, ""));

        [parsed.port, "8091", "8090", "8081", "8080"].forEach((port) => {
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

function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (_error) {
    return null;
  }
}

function enrichMedicationsResponseFromHomeData(responseData, homeData, normalizedPeriod) {
  const homeMedications = Array.isArray(homeData?.medications) ? homeData.medications : [];
  const homeMedicationsById = new Map(
    homeMedications
      .filter((medication) => medication?.id != null)
      .map((medication) => [String(medication.id), medication])
  );

  const responseMedications = Array.isArray(responseData?.medications) ? responseData.medications : [];
  const enrichedMedications = responseMedications.map((medication) => {
    const homeMedication = homeMedicationsById.get(String(medication?.id));
    return {
      ...medication,
      status: medication?.status || homeMedication?.status || "",
      takenAt: medication?.takenAt || homeMedication?.takenAt || null,
    };
  });

  const filteredHomeMedications = normalizedPeriod === "all"
    ? homeMedications
    : homeMedications.filter((medication) =>
        String(medication?.period || "").trim().toLowerCase() === normalizedPeriod
      );

  const takenCountFromHome = homeMedications.filter((medication) =>
    String(medication?.status || "").trim().toLowerCase() === "taken" || Boolean(medication?.takenAt)
  ).length;

  return {
    ...responseData,
    count: Number.isFinite(Number.parseInt(responseData?.count, 10))
      ? Number.parseInt(responseData.count, 10)
      : filteredHomeMedications.length,
    takenCount: Number.isFinite(Number.parseInt(responseData?.takenCount, 10))
      ? Number.parseInt(responseData.takenCount, 10)
      : takenCountFromHome,
    medications: enrichedMedications,
  };
}

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function createRequestController() {
  if (typeof AbortController === "undefined") {
    return { signal: undefined, clear: () => {} };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}

async function request(path, { method = "GET", body } = {}) {
  const candidateBaseUrls = buildCandidateBaseUrls();
  if (!candidateBaseUrls.length) {
    throw new Error("API base URL is missing. Set REACT_APP_API_BASE_URL.");
  }

  let lastNetworkError = null;

  for (let i = 0; i < candidateBaseUrls.length; i += 1) {
    const candidateBaseUrl = candidateBaseUrls[i];
    const isLastCandidate = i === candidateBaseUrls.length - 1;
    let response;
    let requestControl;

    try {
      requestControl = createRequestController();
      response = await fetch(`${candidateBaseUrl}${path}`, {
        method,
        headers: buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: requestControl.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        lastNetworkError = new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms`);
      } else {
        lastNetworkError = error;
      }
      if (!isLastCandidate) continue;
      if (isLikelyNetworkError(lastNetworkError) || error?.name === "AbortError") {
        throw new Error(getFriendlyUnavailableMessage());
      }
      throw lastNetworkError;
    } finally {
      if (requestControl) {
        requestControl.clear();
      }
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok) return data;

    if (response.status === 404 && !isLastCandidate) {
      continue;
    }

    const isServerError = response.status >= 500 && response.status <= 504;
    if (isServerError && !isLastCandidate) {
      continue;
    }
    const httpError = new Error(data?.message || `HTTP ${response.status} ${response.statusText}`);
    httpError.status = response.status;
    throw httpError;
  }

  if (lastNetworkError) {
    if (isLikelyNetworkError(lastNetworkError)) {
      throw new Error(getFriendlyUnavailableMessage());
    }
    throw lastNetworkError;
  }

  throw new Error("Une erreur serveur est survenue.");
}

export function parseSeniorIdFromUser(user) {
  const rawId = user?.id;
  if (typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0) {
    return rawId;
  }
  if (typeof rawId !== "string") {
    return null;
  }
  const match = rawId.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function getSeniorHome({ seniorId, date } = {}) {
  if (!seniorId) {
    throw new Error("seniorId is required.");
  }
  const params = new URLSearchParams({ seniorId: String(seniorId) });
  if (date) {
    params.set("date", date);
  }
  return request(`/senior/home?${params.toString()}`, { method: "GET" });
}

export async function getSeniorMedications({ seniorId, period = "all" } = {}) {
  if (!seniorId) {
    throw new Error("seniorId is required.");
  }
  const normalizedPeriod = String(period || "all").trim().toLowerCase();
  const params = new URLSearchParams({ seniorId: String(seniorId), period: normalizedPeriod });
  try {
    const responseData = await request(`/senior/medications?${params.toString()}`, { method: "GET" });
    const apiMedications = Array.isArray(responseData?.medications) ? responseData.medications : [];
    const missingDailyState = apiMedications.length > 0
      && apiMedications.every((medication) => !medication?.status && !medication?.takenAt)
      && !Number.isFinite(Number.parseInt(responseData?.takenCount, 10));

    if (!missingDailyState) {
      return responseData;
    }

    const homeData = await getSeniorHome({ seniorId });
    return enrichMedicationsResponseFromHomeData(responseData, homeData, normalizedPeriod);
  } catch (error) {
    const message = String(error?.message || "");
    const endpointMissing = error?.status === 404 || /404/i.test(message) || /not found/i.test(message);
    if (!endpointMissing) {
      throw error;
    }

    // Backward-compatible fallback when /senior/medications is not deployed yet.
    const homeData = await getSeniorHome({ seniorId });
    const allMedications = Array.isArray(homeData?.medications)
      ? homeData.medications.map((medication) => ({
          id: medication?.id,
          name: medication?.name || "",
          dosage: medication?.dosage || "",
          period: medication?.period || "",
          time: medication?.time || "",
          frequency: medication?.frequency || "",
          instruction: medication?.instruction || "",
          active: true,
        }))
      : [];

    const filteredMedications = normalizedPeriod === "all"
      ? allMedications
      : allMedications.filter((medication) =>
          String(medication?.period || "").trim().toLowerCase() === normalizedPeriod
        );

    return {
      count: allMedications.length,
      takenCount: allMedications.filter((medication) =>
        String(medication?.status || "").trim().toLowerCase() === "taken" || Boolean(medication?.takenAt)
      ).length,
      period: normalizedPeriod,
      medications: filteredMedications,
    };
  }
}

export async function markMedicationTaken({ medicationId, seniorId, scheduledAt, takenAt }) {
  if (!medicationId || !seniorId) {
    throw new Error("medicationId and seniorId are required.");
  }
  return request(`/senior/home/medications/${medicationId}/take`, {
    method: "POST",
    body: { seniorId, scheduledAt, takenAt },
  });
}

export async function submitDailyCheckin({ seniorId, question, answer }) {
  if (!seniorId || !answer) {
    throw new Error("seniorId and answer are required.");
  }
  return request("/senior/home/checkins", {
    method: "POST",
    body: { seniorId, question, answer },
  });
}

export async function triggerSos({ seniorId, comment }) {
  if (!seniorId) {
    throw new Error("seniorId is required.");
  }
  return request("/senior/home/sos", {
    method: "POST",
    body: { seniorId, comment },
  });
}

export async function getSeniorAssistantHistory({ seniorId, date } = {}) {
  if (!seniorId) {
    throw new Error("seniorId is required.");
  }
  const params = new URLSearchParams({ seniorId: String(seniorId) });
  if (date) {
    params.set("date", date);
  }
  return request(`/senior/assistant/history?${params.toString()}`, { method: "GET" });
}

export async function sendSeniorAssistantMessage({ seniorId, message, date } = {}) {
  if (!seniorId || !message) {
    throw new Error("seniorId and message are required.");
  }
  const body = { seniorId, message };
  if (date) {
    body.date = date;
  }
  return request("/senior/assistant/chat", {
    method: "POST",
    body,
  });
}

export async function getSeniorProfile({ seniorId } = {}) {
  if (!seniorId) {
    throw new Error("seniorId is required.");
  }
  const params = new URLSearchParams({ seniorId: String(seniorId) });
  return request(`/senior/profile?${params.toString()}`, { method: "GET" });
}

export async function saveSeniorProfile({ seniorId, profileData } = {}) {
  if (!seniorId || !profileData) {
    throw new Error("seniorId and profileData are required.");
  }
  const params = new URLSearchParams({ seniorId: String(seniorId) });
  return request(`/senior/profile?${params.toString()}`, {
    method: "POST",
    body: profileData,
  });
}
