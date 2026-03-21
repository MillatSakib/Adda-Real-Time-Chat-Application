import "./App.css";
import Navbar from "./components/Navbar";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";
import { Loader } from "lucide-react";
import Footer from "./pages/Footer";
import { Toaster } from "react-hot-toast";

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (isCheckingAuth && !authUser) {
    console.log("Spinner block execute");
    return (
      <div
        data-theme={theme}
        className="flex h-screen items-center justify-center bg-base-200 text-base-content"
      >
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-base-200 text-base-content transition-colors duration-300"
    >
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={authUser ? <Navigate to="/" /> : <SignUpPage />}
        />
        <Route
          path="/login"
          element={authUser ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>
      {!authUser && <Footer />}
      <Toaster />
    </div>
  );
}

export default App;
