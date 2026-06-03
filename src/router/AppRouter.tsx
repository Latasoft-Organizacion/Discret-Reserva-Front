import { BrowserRouter, Routes, Route } from 'react-router-dom';


// Páginas públicas
import ClientLandingPage from '../pages/ClientLandingPage';
import ClientRatingPage from '../pages/ClientRatingPage';
import ClientRegisterPage from '../pages/ClientRegisterPage';
import ConfirmReservationPage from '../pages/ConfirmReservationPage';
import AdminRoute from '../components/AdminRoute';

// Páginas administrativas
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import RoomsPage from '../pages/RoomsPage';
import ReservationsPage from '../pages/ReservationsPage';
import AdminReservationsPage from '../pages/AdminReservationsPage';
import AgendaPage from '../pages/AgendaPage';
import ClientsPage from '../pages/ClientsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';

function AppRouter() {
  return (
    <BrowserRouter basename="/discret">
      <Routes>
        {/* Landing pública cliente */}
        <Route path="/" element={<ClientLandingPage />} />
        <Route path="/registro" element={<ClientRegisterPage />} />
        <Route path="/valoracion" element={<ClientRatingPage />} />
        <Route path="/valoracion/:token" element={<ClientRatingPage />} />

        {/* Formulario de reserva cliente */}
        <Route path="/reservas" element={<ReservationsPage />} />

        {/* Confirmación de reserva cliente */}
        <Route path="/confirmar-reserva" element={<ConfirmReservationPage />} />

        {/* Login administrador */}
        <Route path="/login" element={<LoginPage />} />

        {/* Panel administrativo */}
        <Route path="/dashboard" element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/habitaciones" element={<AdminRoute><RoomsPage /></AdminRoute>} />
        <Route path="/reservas-admin" element={<AdminRoute><AdminReservationsPage /></AdminRoute>} />
        <Route path="/agenda" element={<AdminRoute><AgendaPage /></AdminRoute>} />
        <Route path="/clientes" element={<AdminRoute><ClientsPage /></AdminRoute>} />
        <Route path="/reportes" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="/configuracion" element={<AdminRoute><SettingsPage /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
