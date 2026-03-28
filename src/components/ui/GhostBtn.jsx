import { T } from "../../styles/theme";

export function GhostBtn({ children, active, onClick, style = {}, ...rest }) {
  const isSegmented = typeof active === "boolean";
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        width: isSegmented ? undefined : "100%",
        flex: isSegmented ? 1 : undefined,
        minWidth: isSegmented ? 0 : undefined,
        padding: isSegmented ? "13px 10px" : "15px 24px",
        borderRadius: 16,
        border: isSegmented ? `2px solid ${active ? T.primary : T.teal100}` : `2px solid ${T.teal200}`,
        background: isSegmented ? (active ? T.teal50 : "white") : "white",
        color: isSegmented ? (active ? T.primaryDark : T.navy) : T.navy,
        fontWeight: 600,
        fontSize: 15,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 0.2s",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
