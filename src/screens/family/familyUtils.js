import { useEffect, useState } from "react";
import { getLinkedSeniors } from "../../services/homeApi";
import { T } from "../../styles/theme";
import { getStoredAuthUser, setStoredAuthUser } from "../../utils/authStorage";
import { parseLocalDateTime } from "../../utils/dateTime";

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

function readStoredAuthUser() {
  return getStoredAuthUser();
}

function writeStoredAuthUser(user) {
  setStoredAuthUser(user);
}

export function normalizeLinkedSenior(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const seniorId = toPositiveInt(value.id)
    || toPositiveInt(value.seniorId)
    || toPositiveInt(value.linkedSeniorId);

  return {
    ...value,
    id: seniorId,
    seniorId,
  };
}

export function normalizeLinkedSeniors(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map(normalizeLinkedSenior)
    .filter((senior) => toPositiveInt(senior?.id));
}

export function getEffectiveFamilyUser(user) {
  if (user) {
    return user;
  }
  return readStoredAuthUser();
}

export function persistActiveFamilySenior(senior) {
  const normalizedSenior = normalizeLinkedSenior(senior);
  const seniorId = toPositiveInt(normalizedSenior?.id);
  if (!seniorId) {
    return null;
  }

  const storedUser = readStoredAuthUser() || {};
  writeStoredAuthUser({
    ...storedUser,
    linkedSeniorId: seniorId,
    linkedSenior: normalizedSenior,
  });

  return seniorId;
}

export function resolveFamilySeniorId(user) {
  const explicitCandidates = [
    user?.linkedSeniorId,
    user?.seniorId,
    user?.linkedSenior?.id,
    user?.linkedSenior?.seniorId,
    user?.linked_senior_id,
    user?.profile?.linkedSeniorId,
    user?.profile?.linkedSenior?.id,
    user?.profile?.linkedSenior?.seniorId,
  ];

  for (const candidate of explicitCandidates) {
    const parsed = toPositiveInt(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export function useFamilySeniorId(user) {
  const [seniorId, setSeniorId] = useState(() => resolveFamilySeniorId(getEffectiveFamilyUser(user)));
  const [isResolvingSenior, setIsResolvingSenior] = useState(() => !resolveFamilySeniorId(getEffectiveFamilyUser(user)));

  useEffect(() => {
    const effectiveUser = getEffectiveFamilyUser(user);
    const explicitSeniorId = resolveFamilySeniorId(effectiveUser);
    const role = String(effectiveUser?.role || "").trim().toLowerCase();

    if (explicitSeniorId) {
      setSeniorId(explicitSeniorId);
      setIsResolvingSenior(false);
      return undefined;
    }

    if (role !== "famille") {
      setSeniorId(null);
      setIsResolvingSenior(false);
      return undefined;
    }

    let cancelled = false;

    setIsResolvingSenior(true);

    (async () => {
      try {
        const data = await getLinkedSeniors();
        const seniors = normalizeLinkedSeniors(
          Array.isArray(data?.seniors) ? data.seniors : Array.isArray(data) ? data : []
        );
        const nextSenior = seniors[0] || null;
        const nextSeniorId = nextSenior ? persistActiveFamilySenior(nextSenior) : null;
        if (!cancelled) {
          setSeniorId(nextSeniorId);
        }
      } catch (_error) {
        if (!cancelled) {
          setSeniorId(null);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingSenior(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    user?.id,
    user?.role,
    user?.linkedSeniorId,
    user?.linked_senior_id,
    user?.linkedSenior?.id,
    user?.linkedSenior?.seniorId,
    user?.profile?.linkedSeniorId,
    user?.profile?.linkedSenior?.id,
    user?.profile?.linkedSenior?.seniorId,
  ]);

  return { seniorId, isResolvingSenior, setSeniorId };
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
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
    return String(value);
  }
  return parsed.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFamilyDate(value) {
  if (!value) return "--";
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
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
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
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
    const leftDate = parseLocalDateTime(getValue(left))?.getTime() ?? Number.NEGATIVE_INFINITY;
    const rightDate = parseLocalDateTime(getValue(right))?.getTime() ?? Number.NEGATIVE_INFINITY;
    return rightDate - leftDate;
  });
}
