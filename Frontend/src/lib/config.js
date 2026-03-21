const rawServerUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5005";

export const SERVER_URL = rawServerUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const API_URL = `${SERVER_URL}/api`;
