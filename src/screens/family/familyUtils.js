import { parseSeniorIdFromUser } from "../../services/homeApi";
import { T } from "../../styles/theme";

function toPositiveInt(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function getEffectiveFamilyUser(user) {
  if (user) {
    return user;
  }
  try {
    const raw = localStorage.getItem("cura_auth_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export function resolveFamilySeniorId(user) {
  const explicitCandidates = [
    user?.linkedSeniorId,
    user?.seniorId,
    user?.linked_senior_id,
    user?.profile?.linkedSeniorId,
    user?.linkedSenior?.id,
  ];

  for (const candidate of explicitCandidates) {
    const parsed = toPositiveInt(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return parseSeniorIdFromUser(user);
}

export function getFamilyFirstName(value, fallback = "Famille") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  return raw.split(/\s+/)[0] || fallback;
}

export function isMedicationTaken(medication) {
  const status = String(medication?.status || "").trim().toLowerCase();
  return status === "taken" || Boolean(medication?.takenAt);
}

export function getMedicationStatusMeta(status) {
  const key = String(status || "").trim().toLowerCase();
  const map = {
    taken: { label: "Pris", bg: T.successLight, color: T.success },
    pending: { label: "En attente", bg: T.warningLight, color: T.warning },
    upcoming: { label: "A venir", bg: "#E9F7F5", color: T.primaryDark },
    missed: { label: "Manque", bg: T.dangerLight, color: T.danger },
  };
  return map[key] || map.pending;
}

export function formatFamilyTime(value) {
  if (!value) return "--:--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFamilyDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function formatFamilyDateTime(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeAnswerLabel(value) {
  const text = String(value || "").trim();
  return text || "Aucune reponse";
}

export function sortByDateDesc(list, getValue) {
  return [...list].sort((left, right) => {
    const leftDate = new Date(getValue(left)).getTime();
    const rightDate = new Date(getValue(right)).getTime();
    return rightDate - leftDate;
  });
}
