import { T } from "../../styles/theme";

export function TextBtn({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        background: "none",
        color: T.primary,
        fontWeight: 800,
        fontSize: 14,
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
