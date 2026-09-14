import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoutes } from './components/AdminGate';
import AdminAbPage from './pages/AdminAbPage';
import AdminFillRulesPage from './pages/AdminFillRulesPage';
import AdminLeadsPage from './pages/AdminLeadsPage';
import AdminMensajesPage from './pages/AdminMensajesPage';
import AdminMetasPage from './pages/AdminMetasPage';
import AdminPoaPage from './pages/AdminPoaPage';
import AdminRulesHistoryPage from './pages/AdminRulesHistoryPage';
import AdminRulesStatusPage from './pages/AdminRulesStatusPage';
import AppealsPage from './pages/AppealsPage';
import DiagnosticoPage from './pages/DiagnosticoPage';
import InformePage from './pages/InformePage';
import LandingPage from './pages/LandingPage';
import ProspeccionPage from './pages/ProspeccionPage';
import RevisionPage from './pages/RevisionPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/appeals" element={<AppealsPage />} />
      <Route path="/revision" element={<RevisionPage />} />
      <Route path="/diagnostico" element={<DiagnosticoPage />} />
      <Route path="/informe/:id" element={<InformePage />} />

      {/* Todo lo interno cuelga del portero: ninguna de estas paginas se monta
          —ni pide datos— hasta que hay sesion. Ver AdminGate.tsx. */}
      <Route element={<AdminRoutes />}>
        <Route path="/admin" element={<Navigate to="/admin/leads" replace />} />
        <Route path="/admin/leads" element={<AdminLeadsPage />} />
        <Route path="/admin/metas" element={<AdminMetasPage />} />
        <Route path="/admin/mensajes" element={<AdminMensajesPage />} />
        <Route path="/admin/rules-status" element={<AdminRulesStatusPage />} />
        <Route path="/admin/fill-rules" element={<AdminFillRulesPage />} />
        <Route path="/admin/rules-history" element={<AdminRulesHistoryPage />} />
        <Route path="/admin/poa" element={<AdminPoaPage />} />
        <Route path="/admin/ab" element={<AdminAbPage />} />
        <Route path="/prospeccion" element={<ProspeccionPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
