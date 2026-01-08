import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import Alunos from './pages/Academic/Alunos';
import Avaliacoes from './pages/Evaluations/Avaliacoes';
import Faltas from './pages/Evaluations/Faltas';
import Relatorios from './pages/Academic/Relatorios';
import AdminGeral from './pages/Admin/AdminGeral';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="alunos" element={<Alunos />} />
            <Route path="avaliacoes" element={<Avaliacoes />} />
            <Route path="faltas" element={<Faltas />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="admin" element={<AdminGeral />} />
            <Route path="configuracoes" element={<div className="p-4">Configurações (Em construção)</div>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
