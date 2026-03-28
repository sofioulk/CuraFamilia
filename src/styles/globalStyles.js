import { T } from "./theme";

export const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
  
  @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes slideUp  { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes scaleIn  { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes pulseSoft { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.03);opacity:0.92} }
  @keyframes typing { 0%,80%,100%{transform:scale(.7);opacity:.35} 40%{transform:scale(1);opacity:1} }
  @keyframes sosHeartbeat {
    0%, 100% { transform: scale(1); box-shadow: 0 8px 20px rgba(15,23,42,0.08); }
    10% { transform: scale(1.015); box-shadow: 0 10px 24px rgba(239,68,68,0.14); }
    20% { transform: scale(1); box-shadow: 0 8px 20px rgba(15,23,42,0.08); }
    30% { transform: scale(1.01); box-shadow: 0 9px 22px rgba(239,68,68,0.12); }
    45% { transform: scale(1); box-shadow: 0 8px 20px rgba(15,23,42,0.08); }
  }
  @keyframes alertPulse {
    0%,100% { transform:scale(1); box-shadow:0 12px 28px rgba(239,68,68,0.24); }
    50% { transform:scale(1.015); box-shadow:0 18px 36px rgba(239,68,68,0.36); }
  }
  @keyframes alertRing {
    0% { transform:scale(0.96); opacity:0.45; }
    70% { transform:scale(1.04); opacity:0.14; }
    100% { transform:scale(1.08); opacity:0; }
  }
  @keyframes alertBlink {
    0%,100% { opacity:1; transform:translateY(0); }
    50% { opacity:0.72; transform:translateY(-1px); }
  }
  
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:${T.bg}; font-family:'DM Sans',sans-serif; }
  ::-webkit-scrollbar { display:none }
  input:-webkit-autofill { -webkit-box-shadow:0 0 0px 1000px ${T.teal50} inset !important; -webkit-text-fill-color:${T.navy} !important; }
`;
