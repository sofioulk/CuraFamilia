import React from "react";
import { Phone } from "../../components/ui/Phone";
import { T } from "../../styles/theme";
import { FamilyBottomNav } from "../../components/family/FamilyBottomNav";
import { Icon } from "../../components/icons/Icons";

function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 12px 16px", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: T.textLight, fontWeight: 600 }}>
        {title}
      </h3>
      <div style={{
        backgroundColor: T.white, borderRadius: 20, padding: "0 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.03)"
      }}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ icon: RowIcon, label, value, isLink, noBorder }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0",
      borderBottom: noBorder ? "none" : `1px solid rgba(0,0,0,0.04)`, cursor: isLink ? "pointer" : "default"
    }}>
       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {RowIcon && <div style={{ color: T.textLight }}><RowIcon size={18} /></div>}
          <span style={{ fontSize: 15, fontWeight: 500, color: T.navy }}>{label}</span>
       </div>
       <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.textLight }}>
          <span style={{ fontSize: 13 }}>{value}</span>
          {isLink && <span style={{ fontSize: 16 }}>&gt;</span>}
       </div>
    </div>
  );
}

export default function FamilySettings({ user, onNavigate }) {

  const handleLogout = () => {
    localStorage.removeItem("cura_auth_user");
    localStorage.removeItem("cura_auth_token");
    window.location.href = "/";
  };

  return (
    <Phone>
      <div style={{ padding: "24px 20px 100px", minHeight: "100vh", backgroundColor: "#F7F9FC", fontFamily: "'Inter', sans-serif" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: T.navy }}>Paramètres</h1>
            <p style={{ margin: 0, fontSize: 14, color: T.textLight }}>Configuration de la famille</p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#E2E8F0", display: "flex", justifyContent: "center", alignItems: "center", color: T.navy, fontWeight: 600 }}>
             {user?.name?.charAt(0) || "F"}
          </div>
        </div>

        {/* Pairing Code Card */}
        <div style={{
          backgroundColor: T.navy, borderRadius: 20, padding: 24, marginBottom: 24, color: T.white, boxShadow: "0 8px 24px rgba(13,148,136,0.15)", position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.1 }}><Icon.Shield size={120} /></div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, zIndex: 2, position: "relative" }}>Code de Liaison</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.8, lineHeight: 1.5, zIndex: 2, position: "relative" }}>
            Donnez ce code à votre proche senior pour associer le téléphone.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 2, position: "relative" }}>
             <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 4 }}>749-012</span>
             <button style={{ padding: "6px 12px", borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.2)", color: T.white, fontWeight: 600, cursor: "pointer" }}>Copier</button>
          </div>
        </div>

        <SettingsSection title="Compte">
          <SettingsRow icon={Icon.User} label="Profil de Sofia" isLink />
          <SettingsRow icon={Icon.Mail} label="Adresse Email" value={user?.email || "Email non défini"} noBorder />
        </SettingsSection>

        <SettingsSection title="Médical & Rapports">
          {/* THE PDF REPORT BUTTON */}
          <div style={{
             display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", cursor: "pointer", borderBottom: `1px solid rgba(0,0,0,0.04)`
          }}>
             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: T.primary }}><Icon.FileText active size={18} /></div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                   <span style={{ fontSize: 15, fontWeight: 600, color: T.navy }}>Générer Rapport Bilan</span>
                   <span style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>Export PDF pour le médecin</span>
                </div>
             </div>
             <span style={{ fontSize: 16, color: T.primary }}>&gt;</span>
          </div>
          <SettingsRow icon={Icon.Bell} label="Alertes SOS (SMS)" value="Activé" noBorder />
        </SettingsSection>

        <SettingsSection title="Sécurité">
          <div 
             onClick={handleLogout}
             style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", cursor: "pointer", borderBottom: "none", color: "#EF4444" }}
          >
             <Icon.LogOut size={18} />
             <span style={{ fontSize: 15, fontWeight: 600 }}>Déconnexion</span>
          </div>
        </SettingsSection>
        
      </div>
      <FamilyBottomNav activeTab="family_settings" onNavigate={onNavigate} />
    </Phone>
  );
}
