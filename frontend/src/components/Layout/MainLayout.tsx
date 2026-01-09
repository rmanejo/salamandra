import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';
import { Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const MainLayout: React.FC = () => {
    const { user } = useAuth();
    const isBlocked = user?.school_blocked && user?.role !== 'ADMIN_SISTEMA' && user?.role !== 'ADMIN_ESCOLA';

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
