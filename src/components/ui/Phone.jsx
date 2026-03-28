import { T } from "../../styles/theme";
import { css } from "../../styles/globalStyles";

export function Phone({ children, bg = T.bg }) {
  return (
    <div
      style={{
        width: 390,
        maxWidth: "100%",
        minHeight: "100vh",
        margin: "0 auto",
        background: bg,
        fontFamily: "'DM Sans', sans-serif",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 0 60px rgba(13,148,136,0.12)",
      }}
    >
      <style>{css}</style>
      {children}
    </div>
  );
}
