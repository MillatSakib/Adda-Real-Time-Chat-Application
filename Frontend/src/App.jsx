import "./App.css";
import Navbar from "./components/Navbar";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useCallStore } from "./store/useCallStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";
import { Loader } from "lucide-react";
import Footer from "./pages/Footer";
import { Toaster } from "react-hot-toast";
import CallInterface from "./components/CallInterface";
import { warmupSoundEffects } from "./lib/sound";

function App() {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const initializeCallHandlers = useCallStore(
    (state) => state.initializeCallHandlers,
  );
  const cleanupCallHandlers = useCallStore(
    (state) => state.cleanupCallHandlers,
  );
  const endCall = useCallStore((state) => state.endCall);
  const initializeMessageHandlers = useChatStore(
    (state) => state.initializeMessageHandlers,
  );
  const cleanupMessageHandlers = useChatStore(
    (state) => state.cleanupMessageHandlers,
  );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    warmupSoundEffects();
  }, []);

  useEffect(() => {
    if (!socket) return undefined;

    initializeCallHandlers(socket);

    return () => cleanupCallHandlers(socket);
  }, [socket, initializeCallHandlers, cleanupCallHandlers]);

  useEffect(() => {
    if (!socket) return undefined;

    initializeMessageHandlers(socket);

    return () => cleanupMessageHandlers(socket);
  }, [socket, initializeMessageHandlers, cleanupMessageHandlers]);

  useEffect(() => {
    if (!socket) {
      endCall(false);
    }
  }, [socket, endCall]);

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
      <CallInterface />
      <Toaster />
    </div>
  );
}

export default App;
