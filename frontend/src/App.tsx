import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login/Login';
import AdminGeral from './pages/Admin/AdminGeral';
import MeuPerfil from './pages/Profile/MeuPerfil';
import Reports from './pages/Reports/Reports';

// Dashboards
import AdminSistemaDashboard from './pages/Dashboard/AdminSistemaDashboard';
import Sdejtdashboard from './pages/Dashboard/Sdejtdashboard';
import DirectorDashboard from './pages/Dashboard/DirectorDashboard';
import DapDashboard from './pages/Dashboard/DapDashboard';
import ProfessorDashboard from './pages/Dashboard/ProfessorDashboard';
import AdministrativoDashboard from './pages/Dashboard/AdministrativoDashboard';
import GestaoAlunos from './pages/Academic/GestaoAlunos';
import GestaoTurmas from './pages/Academic/GestaoTurmas';
import GestaoFuncionarios from './pages/Staff/GestaoFuncionarios';
import GestaoCargosProfessores from './pages/Staff/GestaoCargosProfessores';
import AtribuicaoTurma from './pages/Academic/AtribuicaoTurma';
import AtribuicaoProfessor from './pages/Academic/AtribuicaoProfessor';
import GestaoTurmasDAE from './pages/Academic/GestaoTurmasDAE';

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
            <Route index element={<Navigate to="/login" replace />} />

            {/* Admin Sistema */}
            <Route path="admin" element={<AdminSistemaDashboard />} />
            <Route path="admin/distritos" element={<AdminGeral />} />
            <Route path="admin/escolas" element={<AdminGeral />} />

            {/* SDEJT */}
            <Route path="sdejt" element={<Sdejtdashboard />} />
            <Route path="sdejt/escolas" element={<GenericPlaceholder title="Escolas do Distrito" />} />

            {/* Escola - Director */}
            <Route path="director" element={<DirectorDashboard />} />
            <Route path="director/recursos" element={<GestaoFuncionarios />} />
            <Route path="director/configuracoes" element={<GenericPlaceholder title="Configurações da Escola" />} />

            {/* Escola - Pedagógico (DAP/DAE) */}
            <Route path="dap" element={<DapDashboard />} />
            <Route path="dap/professores" element={<GestaoCargosProfessores />} />
            <Route path="dap/turmas" element={<GestaoTurmasDAE />} />
            <Route path="dae" element={<DapDashboard />} />
            <Route path="dae/cargos" element={<GestaoCargosProfessores />} />

            {/* Atribuição de Disciplinas (Shared DAP/DAE) */}
            <Route path="academico/atribuicao-turmas" element={<AtribuicaoTurma />} />
            <Route path="academico/atribuicao-professor" element={<AtribuicaoProfessor />} />

            {/* Escola - Professor */}
            <Route path="professor" element={<ProfessorDashboard />} />
            <Route path="professor/notas" element={<GenericPlaceholder title="Lançamento de Notas" />} />
            <Route path="professor/faltas" element={<GenericPlaceholder title="Lançamento de Faltas" />} />

            {/* Escola - Administrativo */}
            <Route path="administrativo" element={<AdministrativoDashboard />} />
            <Route path="admin-escolar/alunos" element={<GestaoAlunos />} />
            <Route path="admin-escolar/formar-turmas" element={<GestaoTurmas />} />
            <Route path="admin-escolar/disciplinas" element={<GenericPlaceholder title="Gestão de Disciplinas" />} />
            <Route path="admin-escolar/funcionarios" element={<GestaoFuncionarios />} />

            {/* Comum */}
            <Route path="relatorios" element={<Reports />} />
            <Route path="meu-perfil" element={<MeuPerfil />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Pequeno helper para rotas que ainda não têm página própria
const GenericPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4">
    <h2>{title}</h2>
    <p>Esta página será implementada em breve.</p>
  </div>
);

export default App;
