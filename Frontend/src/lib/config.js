const envServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const browserOrigin =
  typeof window !== "undefined" ? window.location.origin : "";
const rawServerUrl = envServerUrl || browserOrigin || "http://localhost:5005";

export const SERVER_URL = rawServerUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const API_URL = `${SERVER_URL}/api`;
