import { T } from "../../styles/theme";
import { Icon } from "../icons/Icons";

export function BottomNav({ current = "dashboard", onNavigate = () => {} }) {
  const items = [
    { id: "dashboard", label: "Accueil", icon: <Icon.Home />, screen: "dashboard" },
    { id: "medications", label: "M\u00E9dic.", icon: <Icon.Pill />, screen: "medications" },
    { id: "assistant", label: "Assistant", icon: <Icon.Bot />, screen: "assistant" },
    { id: "profile", label: "Profil", icon: <Icon.User />, screen: "profile" },
  ];

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(12px)",
        borderTop: `1px solid ${T.teal100}`,
        padding: "10px 10px 18px",
        display: "flex",
        justifyContent: "space-around",
      }}
    >
      {items.map((item) => {
        const isActive = current === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.screen)}
            style={{
              border: "none",
              background: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              color: isActive ? T.primary : T.textLight,
              fontSize: 11,
              fontWeight: isActive ? 800 : 600,
              cursor: "pointer",
              minWidth: 70,
            }}
          >
            {isActive ? <item.icon.type {...item.icon.props} active /> : item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
