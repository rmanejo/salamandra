import React from 'react';
import { Navbar, Container, Nav, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBell } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const Topbar: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Navbar bg="white" expand="lg" className="border-bottom topbar shadow-sm">
            <Container fluid>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav className="align-items-center gap-3">
                        <Nav.Link href="#notifications" className="text-secondary">
                            <FaBell size={20} />
                        </Nav.Link>
                        <Dropdown align="end">
                            <Dropdown.Toggle variant="link" id="dropdown-user" className="text-decoration-none text-dark d-flex align-items-center gap-2 p-0">
                                <div className="text-end d-none d-md-block">
                                    <div className="fw-bold small">{user?.role_display || 'Utilizador'}</div>
                                    <div className="text-muted smaller" style={{ fontSize: '0.75rem' }}>{user?.school_name || 'Escola'}</div>
                                </div>
                                <FaUserCircle size={32} className="text-secondary" />
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="shadow border-0">
                                <Dropdown.Item href="#profile">Perfil</Dropdown.Item>
                                <Dropdown.Item href="#settings">Configurações</Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={handleLogout} className="text-danger">Sair</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Topbar;
