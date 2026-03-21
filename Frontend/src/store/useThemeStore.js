import { create } from "zustand";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) return savedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  setTheme: (nextTheme) => {
    localStorage.setItem("theme", nextTheme);
    set({ theme: nextTheme });
  },
}));
