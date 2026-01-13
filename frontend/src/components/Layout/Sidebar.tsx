import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    FaThLarge,
    FaUserGraduate,
    FaChalkboardTeacher,
    FaFileAlt,
    FaChartBar,
    FaCog,
    FaSignOutAlt,
    FaCalendarTimes,
    FaShieldAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    const menuItems = [
        // Dashboard (Dinâmico baseado na role)
        {
            path: user?.role === 'ADMIN_SISTEMA' ? '/admin' :
                user?.role?.startsWith('SDEJT') ? '/sdejt' :
                    user?.role === 'ADMIN_ESCOLA' ? '/director' :
                        (user?.role === 'DAP' || user?.role === 'DAE') ? '/dap' :
                            user?.role === 'PROFESSOR' ? '/professor' :
                                user?.role === 'ADMINISTRATIVO' ? '/administrativo' : '/dashboard',
            icon: <FaThLarge />,
            label: 'Dashboard'
        },

        // ADMIN_SISTEMA
        ...(user?.role === 'ADMIN_SISTEMA' ? [
            { path: '/admin/distritos', icon: <FaShieldAlt />, label: 'Distritos' },
            { path: '/admin/escolas', icon: <FaShieldAlt />, label: 'Escolas' },
        ] : []),

        // SDEJT
        ...(user?.role?.startsWith('SDEJT') ? [
            { path: '/sdejt/escolas', icon: <FaShieldAlt />, label: 'Escolas do Distrito' },
        ] : []),

        // ADMIN_ESCOLA
        ...(user?.role === 'ADMIN_ESCOLA' ? [
            { path: '/director/recursos', icon: <FaChalkboardTeacher />, label: 'Recursos Humanos' },
            { path: '/director/configuracoes', icon: <FaCog />, label: 'Configurações' },
        ] : []),

        // DAE/DAP (Pedagógico)
        ...((user?.role === 'DAE' || user?.role === 'DAP') ? [
            { path: user.role === 'DAE' ? '/dae/cargos' : '/dap/professores', icon: <FaChalkboardTeacher />, label: 'Gestão de Professores' },
            { path: '/dap/turmas', icon: <FaThLarge />, label: 'Gestão de Turmas' },
            { path: '/academico/atribuicao-professor', icon: <FaUserGraduate />, label: 'Atribuição (Por Prof.)' },
            { path: '/director/recursos', icon: <FaChalkboardTeacher />, label: 'Recursos Humanos' },
            ...(user?.role === 'DAP' && user?.can_lancar_notas ? [
                { path: '/professor/notas', icon: <FaChartBar />, label: 'Lançar Notas' }
            ] : []),
        ] : []),

        // PROFESSOR
        ...(user?.role === 'PROFESSOR' ? [
            // DT Link
            ...(user?.academic_roles?.is_dt ? [
                { path: '/professor/minha-turma', icon: <FaUserGraduate />, label: 'Minha Turma' }
            ] : []),
            // CC Link
            ...(user?.academic_roles?.is_cc ? [
                { path: '/professor/minha-classe', icon: <FaThLarge />, label: 'Minha Classe' }
            ] : []),
            // DD Link
            ...(user?.academic_roles?.is_dd ? [
                { path: '/professor/minha-disciplina', icon: <FaFileAlt />, label: 'Minha Disciplina' }
            ] : []),

            { path: '/professor/notas', icon: <FaChartBar />, label: 'Lançar Notas' },
        ] : []),

        ...(user?.role !== 'PROFESSOR' && user?.academic_roles?.is_dd ? [
            { path: '/professor/minha-disciplina', icon: <FaFileAlt />, label: 'Minha Disciplina' }
        ] : []),

        // ADMINISTRATIVO
        ...(user?.role === 'ADMINISTRATIVO' ? [
            { path: '/admin-escolar/alunos', icon: <FaUserGraduate />, label: 'Gestão de Alunos' },
            { path: '/admin-escolar/formar-turmas', icon: <FaThLarge />, label: 'Formar Turmas' },
            { path: '/admin-escolar/disciplinas', icon: <FaFileAlt />, label: 'Disciplinas' },
            { path: '/admin-escolar/funcionarios', icon: <FaChalkboardTeacher />, label: 'Funcionários' },
        ] : []),

        // ITENS COMUNS
        { path: '/relatorios', icon: <FaFileAlt />, label: 'Relatórios' },
        { path: '/meu-perfil', icon: <FaUserGraduate />, label: 'Meu Perfil' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="sidebar d-flex flex-column flex-shrink-0 p-3 text-white bg-navy">
            <Link to="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <span className="fs-4 fw-bold">SalamandraSGE</span>
            </Link>
            <hr />
            <Nav variant="pills" className="flex-column mb-auto">
                {menuItems.map((item) => (
                    <Nav.Item key={item.path}>
                        <Link
                            to={item.path}
                            className={`nav-link text-white d-flex align-items-center gap-3 ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    </Nav.Item>
                ))}
            </Nav>
            <hr />
            <div className="mt-auto">
                <Nav.Item>
                    <button
                        onClick={handleLogout}
                        className="nav-link text-white d-flex align-items-center gap-3 bg-transparent border-0 w-100 text-start"
                        style={{ cursor: 'pointer' }}
                    >
                        <FaSignOutAlt />
                        Sair
                    </button>
                </Nav.Item>
            </div>
        </div>
    );
};

export default Sidebar;
