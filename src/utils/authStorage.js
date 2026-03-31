const AUTH_TOKEN_KEY = "cura_auth_token";
const AUTH_USER_KEY = "cura_auth_user";
const AUTO_RESTORE_SESSION = process.env.REACT_APP_AUTO_RESTORE_SESSION === "true";

function getSessionStorageSafe() {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch (_error) {
    return null;
  }
}

function getLocalStorageSafe() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch (_error) {
    return null;
  }
}

function readJson(storage, key) {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function hydrateSessionFromLocalStorage() {
  const session = getSessionStorageSafe();
  const local = getLocalStorageSafe();

  if (!session || !local) {
    return null;
  }

  const localToken = local.getItem(AUTH_TOKEN_KEY);
  const localUser = readJson(local, AUTH_USER_KEY);
  if (!localToken || !localUser) {
    return null;
  }

  try {
    session.setItem(AUTH_TOKEN_KEY, localToken);
    session.setItem(AUTH_USER_KEY, JSON.stringify(localUser));
    if (!AUTO_RESTORE_SESSION) {
      local.removeItem(AUTH_TOKEN_KEY);
      local.removeItem(AUTH_USER_KEY);
    }
  } catch (_error) {
    // Ignore storage promotion failures and keep using the local fallback below.
  }

  return { token: localToken, user: localUser };
}

function getStoredAuthSessionSnapshot() {
  const session = getSessionStorageSafe();
  const sessionToken = session?.getItem(AUTH_TOKEN_KEY) || null;
  const sessionUser = readJson(session, AUTH_USER_KEY);
  if (sessionToken && sessionUser) {
    return { token: sessionToken, user: sessionUser };
  }

  const migrated = hydrateSessionFromLocalStorage();
  if (migrated?.token && migrated?.user) {
    return migrated;
  }

  if (!AUTO_RESTORE_SESSION) {
    return null;
  }

  const local = getLocalStorageSafe();
  const localToken = local?.getItem(AUTH_TOKEN_KEY) || null;
  const localUser = readJson(local, AUTH_USER_KEY);
  if (!localToken || !localUser) {
    return null;
  }

  return { token: localToken, user: localUser };
}

export function getStoredAuthToken() {
  return getStoredAuthSessionSnapshot()?.token || null;
}

export function getStoredAuthUser() {
  return getStoredAuthSessionSnapshot()?.user || null;
}

export function setStoredAuthSession({ token, user } = {}) {
  const session = getSessionStorageSafe();
  const local = getLocalStorageSafe();

  try {
    if (session) {
      if (token) {
        session.setItem(AUTH_TOKEN_KEY, token);
      } else {
        session.removeItem(AUTH_TOKEN_KEY);
      }

      if (user) {
        session.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        session.removeItem(AUTH_USER_KEY);
      }
    }

    if (local) {
      if (AUTO_RESTORE_SESSION) {
        if (token) {
          local.setItem(AUTH_TOKEN_KEY, token);
        } else {
          local.removeItem(AUTH_TOKEN_KEY);
        }

        if (user) {
          local.setItem(AUTH_USER_KEY, JSON.stringify(user));
        } else {
          local.removeItem(AUTH_USER_KEY);
        }
      } else {
        local.removeItem(AUTH_TOKEN_KEY);
        local.removeItem(AUTH_USER_KEY);
      }
    }
  } catch (_error) {
    // Ignore storage write failures.
  }
}

export function setStoredAuthUser(user) {
  setStoredAuthSession({ token: getStoredAuthToken(), user });
}

export function clearStoredAuthSession() {
  try {
    getSessionStorageSafe()?.removeItem(AUTH_TOKEN_KEY);
    getSessionStorageSafe()?.removeItem(AUTH_USER_KEY);
    getLocalStorageSafe()?.removeItem(AUTH_TOKEN_KEY);
    getLocalStorageSafe()?.removeItem(AUTH_USER_KEY);
  } catch (_error) {
    // Ignore storage cleanup failures.
  }
}

export function getStoredAuthSession() {
  return getStoredAuthSessionSnapshot();
}
