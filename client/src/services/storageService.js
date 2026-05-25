// client/src/services/storageService.js
//
// Thin wrapper over localStorage / sessionStorage. Centralizes JSON
// serialization and swallows access errors (private mode, quota, etc.) so
// callers don't have to scatter try/catch around every read.
//
// Always import keys from config/storageKeys — never pass raw strings.

import { STORAGE_KEYS, userProfileKey } from "../config/storageKeys.js";

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch (err) {
    console.warn("storageService: operation failed", err);
    return fallback;
  }
};

const storageService = {
  get(key) {
    return safe(() => localStorage.getItem(key));
  },
  set(key, value) {
    return safe(() => {
      localStorage.setItem(key, value);
      return true;
    }, false);
  },
  remove(key) {
    return safe(() => {
      localStorage.removeItem(key);
      return true;
    }, false);
  },
  getJSON(key) {
    const raw = this.get(key);
    if (!raw) return null;
    return safe(() => JSON.parse(raw));
  },
  setJSON(key, value) {
    return safe(() => {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }, false);
  },
  getBool(key) {
    return this.get(key) === "true";
  },

  // sessionStorage variants — for ephemeral state that should not persist
  // across browser sessions (logout flags, temp role selection, etc.)
  session: {
    get(key) {
      return safe(() => sessionStorage.getItem(key));
    },
    set(key, value) {
      return safe(() => {
        sessionStorage.setItem(key, value);
        return true;
      }, false);
    },
    remove(key) {
      return safe(() => {
        sessionStorage.removeItem(key);
        return true;
      }, false);
    },
    getBool(key) {
      return this.get(key) === "true";
    },
  },
};

export { STORAGE_KEYS, userProfileKey };
export default storageService;
