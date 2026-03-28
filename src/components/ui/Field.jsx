import { useState } from "react";
import { T } from "../../styles/theme";
import { Icon } from "../icons/Icons";

export function Field({ label, type = "text", value, onChange, placeholder, icon: Ico, error, hint, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.navyLight, marginBottom: 7, letterSpacing: 0.1 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {Ico && (
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: focused ? T.primary : T.textLight, transition: "color 0.2s", display: "flex", pointerEvents: "none" }}>
            <Ico />
          </div>
        )}
        <input
          autoFocus={autoFocus}
          type={isPass && !showPass ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ width: "100%", padding: `14px ${isPass ? 48 : 16}px 14px ${Ico ? 46 : 16}px`, background: error ? "#fff8f8" : T.teal50, border: `2px solid ${error ? T.danger : focused ? T.primary : T.teal100}`, borderRadius: 14, fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontWeight: 400, color: T.navy, outline: "none", transition: "all 0.2s" }}
        />
        {isPass && (
          <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textLight, display: "flex", padding: 0 }}>
            {showPass ? <Icon.EyeOff /> : <Icon.Eye />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: T.danger, fontWeight: 500, marginTop: 5, paddingLeft: 2, animation: "fadeIn 0.2s" }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 12, color: T.textLight, marginTop: 4, paddingLeft: 2 }}>{hint}</p>}
    </div>
  );
}
