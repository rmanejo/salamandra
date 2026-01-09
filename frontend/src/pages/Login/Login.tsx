import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuth();

    const getDashboardPath = (role: string) => {
        switch (role) {
            case 'ADMIN_SISTEMA': return '/admin';
            case 'SDEJT_RAP':
            case 'SDEJT_REG': return '/sdejt';
            case 'ADMIN_ESCOLA': return '/director';
            case 'DAP': return '/dap';
            case 'DAE': return '/dae';
            case 'PROFESSOR': return '/professor';
            case 'ADMINISTRATIVO': return '/administrativo';
            default: return '/dashboard';
        }
    };

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            navigate(getDashboardPath(user.role));
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
        } catch (err: unknown) {
            const error = err as Error;
            setError(error.message || 'E-mail ou senha inválidos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page bg-navy d-flex align-items-center justify-content-center">
            <Container>
                <Card className="login-card mx-auto shadow-lg border-0">
                    <Card.Body className="p-5">
                        <div className="text-center mb-4">
                            <h1 className="fw-bold text-navy">SalamandraSGE</h1>
                            <p className="text-muted">Sistema de Gestão Escolar</p>
                        </div>

                        {error && <Alert variant="danger">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formBasicEmail">
                                <Form.Label>E-mail</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Seu e-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="py-2"
                                />
                            </Form.Group>

                            <Form.Group className="mb-4" controlId="formBasicPassword">
                                <Form.Label>Senha</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="py-2"
                                />
                            </Form.Group>

                            <div className="d-grid">
                                <Button variant="primary" type="submit" size="lg" disabled={loading}>
                                    {loading ? 'Entrando...' : 'Entrar'}
                                </Button>
                            </div>
                        </Form>

                        <div className="text-center mt-3">
                            <small className="text-muted">
                                Credenciais de teste: admin@escola.com / 123456
                            </small>
                        </div>
                    </Card.Body>
                    <Card.Footer className="bg-light text-center py-3 border-0">
                        <small className="text-muted">Focado em performance e rapidez</small>
                    </Card.Footer>
                </Card>
            </Container>
        </div>
    );
};

export default Login;
