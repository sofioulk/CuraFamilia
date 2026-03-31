import { useState } from "react";
import Splash from "./screens/auth/Splash";
import Onboarding from "./screens/auth/Onboarding";
import Welcome from "./screens/auth/Welcome";
import Login from "./screens/auth/Login";
import Register from "./screens/auth/Register";
import ForgotPassword from "./screens/auth/ForgotPassword";
import Success from "./screens/auth/Success";
import ElderDashboard from "./screens/senior/ElderDashboard";
import ElderMedications from "./screens/senior/ElderMedications";
import ElderAssistant from "./screens/senior/ElderAssistant";
import ElderProfile from "./screens/senior/ElderProfile";
import FamilyDashboard from "./screens/family/FamilyDashboard";
import FamilyHealth from "./screens/family/FamilyHealth";
import FamilyAssistant from "./screens/family/FamilyAssistant";
import FamilyCalendar from "./screens/family/FamilyCalendar";
import FamilySettings from "./screens/family/FamilySettings";
import { SeniorFloatingSos } from "./components/senior/SeniorFloatingSos";
import { getStoredAuthSession, setStoredAuthSession } from "./utils/authStorage";
const AUTO_RESTORE_SESSION = process.env.REACT_APP_AUTO_RESTORE_SESSION === "true";

function restoreSession() {
  return getStoredAuthSession();
}

/**
 * App Component - Main navigation & screen orchestration
 * Pure state management, all UI components are imported from screens/
 */
export default function App() {
  const initialSession = AUTO_RESTORE_SESSION ? restoreSession() : null;
  const [screen, setScreen] = useState(() => {
    if (initialSession) {
      return initialSession.user?.role?.toLowerCase() === "famille" ? "family_dashboard" : "dashboard";
    }
    return "splash";
  });
  const [user, setUser] = useState(() => initialSession?.user || null);

  // Navigation handler
  const handleAuthSuccess = (authData) => {
    const nextUser = authData?.user || authData;
    setUser(nextUser);
    setStoredAuthSession({ token: authData?.token || null, user: nextUser || null });
    setScreen("success");
  };

  const handleNavigate = (nextScreen) => {
    setScreen(nextScreen);
  };

  let content = null;
  let showSeniorSos = false;

  if (screen === "splash") {
    content = <Splash onDone={() => setScreen("onboard")} />;
  } else if (screen === "onboard") {
    content = <Onboarding onDone={() => setScreen("welcome")} />;
  } else if (screen === "welcome") {
    content = <Welcome onLogin={() => setScreen("login")} onRegister={() => setScreen("register")} />;
  } else if (screen === "login") {
    content = <Login onBack={() => setScreen("welcome")} onSuccess={handleAuthSuccess} onRegister={() => setScreen("register")} onForgot={() => setScreen("forgot")} />;
  } else if (screen === "register") {
    content = <Register onBack={() => setScreen("welcome")} onSuccess={handleAuthSuccess} onLogin={() => setScreen("login")} />;
  } else if (screen === "forgot") {
    content = <ForgotPassword onBack={() => setScreen("login")} />;
  } else if (screen === "success") {
    content = <Success user={user} onContinue={() => {
      if (user?.role?.toLowerCase() === "famille") {
        setScreen("family_dashboard");
      } else {
        setScreen("dashboard");
      }
    }} />;
  } else if (screen === "dashboard") {
    content = <ElderDashboard onNavigate={handleNavigate} user={user} />;
    showSeniorSos = true;
  } else if (screen === "medications") {
    content = <ElderMedications onNavigate={handleNavigate} user={user} />;
    showSeniorSos = true;
  } else if (screen === "assistant") {
    content = <ElderAssistant onNavigate={handleNavigate} user={user} />;
    showSeniorSos = true;
  } else if (screen === "profile") {
    content = <ElderProfile onNavigate={handleNavigate} user={user} />;
    showSeniorSos = true;
  } else if (screen === "family_dashboard") {
    content = <FamilyDashboard onNavigate={handleNavigate} user={user} />;
  } else if (screen === "family_health") {
    content = <FamilyHealth onNavigate={handleNavigate} user={user} />;
  } else if (screen === "family_assistant") {
    content = <FamilyAssistant onNavigate={handleNavigate} user={user} />;
  } else if (screen === "family_calendar") {
    content = <FamilyCalendar onNavigate={handleNavigate} user={user} />;
  } else if (screen === "family_settings") {
    content = <FamilySettings onNavigate={handleNavigate} user={user} />;
  }

  if (!content) {
    return null;
  }

  return showSeniorSos ? (
    <>
      {content}
      <SeniorFloatingSos user={user} />
    </>
  ) : content;
}
