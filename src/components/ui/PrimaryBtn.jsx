import { T } from "../../styles/theme";

export function PrimaryBtn({ children, onClick, disabled = false, loading = false, style = {}, ...rest }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
      style={{
        width: "100%",
        border: "none",
        borderRadius: 18,
        padding: "16px 20px",
        background: disabled ? "#a0d4d0" : `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
        color: "white",
        fontSize: 16,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: disabled ? "none" : "0 10px 24px rgba(13,148,136,0.22)",
        ...style,
      }}
    >
      {loading ? (
        <div
          style={{
            width: 20,
            height: 20,
            border: "2.5px solid rgba(255,255,255,0.35)",
            borderTopColor: "white",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
      ) : (
        children
      )}
    </button>
  );
}
