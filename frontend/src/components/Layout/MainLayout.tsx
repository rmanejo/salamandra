import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';

const MainLayout: React.FC = () => {
    return (
        <div className="main-layout d-flex">
            <Sidebar />
            <div className="content-wrapper flex-grow-1">
                <Topbar />
                <main className="p-4 bg-light min-vh-100">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
