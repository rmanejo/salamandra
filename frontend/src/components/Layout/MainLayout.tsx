import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/api';

const MainLayout: React.FC = () => {
    const { user } = useAuth();
    const isBlocked = user?.school_blocked && user?.role !== 'ADMIN_SISTEMA' && user?.role !== 'ADMIN_ESCOLA';
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const ensureProfileComplete = async () => {
            if (!user || user.role !== 'PROFESSOR') {
                return;
            }
            if (location.pathname === '/professor/completar-perfil') {
                return;
            }
            try {
                const status = await profileService.getProfileStatus();
                if (!status.is_complete) {
                    navigate('/professor/completar-perfil', { replace: true });
                }
            } catch (err) {
                console.error('Erro ao verificar perfil profissional', err);
            }
        };
        ensureProfileComplete();
    }, [user, navigate, location.pathname]);

    return (
        <div className="main-layout d-flex">
            <Sidebar />
            <div className="content-wrapper flex-grow-1">
                <Topbar />
                {isBlocked && (
                    <Alert variant="warning" className="m-3 mb-0 shadow-sm border-0 border-start border-warning border-4">
                        <Alert.Heading className="h6 fw-bold">Escola Bloqueada</Alert.Heading>
                        <p className="small mb-0">Esta escola está temporariamente bloqueada. Você tem apenas permissão de leitura.</p>
                    </Alert>
                )}
                <main className="p-4 bg-light min-vh-100">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
