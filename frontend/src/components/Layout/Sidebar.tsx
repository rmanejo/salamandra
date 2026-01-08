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

    const isAdminSistema = user?.role === 'ADMIN_SISTEMA';

    const menuItems = [
        { path: '/dashboard', icon: <FaThLarge />, label: 'Dashboard' },
        { path: '/alunos', icon: <FaUserGraduate />, label: 'Alunos' },
        { path: '/professores', icon: <FaChalkboardTeacher />, label: 'Professores' },
        { path: '/avaliacoes', icon: <FaFileAlt />, label: 'Avaliações' },
        { path: '/faltas', icon: <FaCalendarTimes />, label: 'Faltas' },
        { path: '/relatorios', icon: <FaChartBar />, label: 'Relatórios' },
        ...(isAdminSistema ? [{ path: '/admin', icon: <FaShieldAlt />, label: 'Admin Geral' }] : []),
        { path: '/configuracoes', icon: <FaCog />, label: 'Configurações' },
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
