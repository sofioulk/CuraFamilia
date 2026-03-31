import { T } from "../../styles/theme";
import { parseLocalDateTime } from "../../utils/dateTime";

function formatAppointmentDate(value) {
  if (!value) return "";
  const parsed = parseLocalDateTime(value);
  if (!parsed) return "";

  const datePart = parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timePart = parsed.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).replace(":", "h");

  return `${datePart} à ${timePart}`;
}

export function AppointmentCard({ appointment = null, loading = false, error = "" }) {
  const specialty = appointment?.specialty || "";
  const when = formatAppointmentDate(appointment?.appointmentAt);
  const hasAppointment = Boolean(appointment);
  const isEmptyState = !loading && !error && !hasAppointment;

  let title = "";
  let subtitle = "";

  if (loading) {
    title = "Chargement des rendez-vous...";
    subtitle = "Synchronisation des rendez-vous...";
  } else if (error) {
    title = "Informations indisponibles";
    subtitle = error;
  } else if (hasAppointment) {
    title = specialty || "Rendez-vous medical";
    subtitle = when || "Date non disponible";
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        padding: 16,
        border: `1.5px solid ${T.teal100}`,
        boxShadow: "0 8px 20px rgba(10,124,113,0.06)",
        marginBottom: 16,
      }}
    >
      {isEmptyState ? (
        <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
          Aucun rendez-vous à venir.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.navy, marginBottom: 10 }}>
            Prochain rendez-vous
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>
            {title}
          </div>

          <div style={{ fontSize: 14, color: T.textLight, marginTop: 6 }}>
            {subtitle}
          </div>
        </>
      )}
    </div>
  );
}
