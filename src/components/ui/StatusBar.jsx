import { T } from "../../styles/theme";

export function StatusBar() {
  return (
    <div
      style={{
        padding: "14px 22px 6px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: T.navy,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700 }}>9:41</span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <div style={{ width: 16, height: 10, borderRadius: 3, border: "1.5px solid currentColor" }} />
        <div style={{ width: 14, height: 10, borderRadius: 2, background: "currentColor", opacity: 0.9 }} />
      </div>
    </div>
  );
}
