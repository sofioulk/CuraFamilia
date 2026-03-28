import { T } from "../../styles/theme";
import { Icon } from "../icons/Icons";

function StatusBadge({ status }) {
  const map = {
    taken: {
      label: "Pris",
      bg: T.successLight,
      color: T.success,
    },
    pending: {
      label: "En attente",
      bg: T.warningLight,
      color: T.warning,
    },
    upcoming: {
      label: "À venir",
      bg: T.teal50,
      color: T.primaryDark,
    },
    missed: {
      label: "Manqué",
      bg: T.dangerLight,
      color: T.danger,
    },
  };

  const s = map[status] || map.pending;

  return (
    <span
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export function MedCard({ med }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        padding: 16,
        border: `1.5px solid ${T.teal100}`,
        boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 16,
          background: T.teal50,
          color: T.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon.Pill active />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.navy }}>{med.name}</div>
        <div style={{ fontSize: 13, color: T.textLight, marginTop: 3 }}>
          {med.dosage} • {med.time}
        </div>
      </div>

      <StatusBadge status={med.status} />
    </div>
  );
}
