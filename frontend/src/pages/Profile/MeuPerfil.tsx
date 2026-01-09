import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FaUserCircle, FaSave, FaLock } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';

const MeuPerfil: React.FC = () => {
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('A nova senha e a confirmação não coincidem.');
            return;
        }

        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            await authService.changePassword({
                old_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });
            setSuccess('Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const error = err as any;
            console.error('Change password error:', error);
            const backendError =
                error.response?.data?.detail ||
                error.response?.data?.error ||
                'Não foi possível alterar a senha.';
            setError(backendError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid>
            <Row className="mb-4">
                <Col>
                    <h2 className="fw-bold">Meu Perfil</h2>
                    <p className="text-secondary">Consulte os seus dados e altere a sua senha de acesso.</p>
                </Col>
            </Row>

            <Row className="g-4">
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="text-center">
                            <FaUserCircle size={80} className="text-secondary mb-3" />
                            <h5 className="fw-bold mb-1">{user?.first_name} {user?.last_name}</h5>
                            <p className="text-muted mb-1">{user?.email}</p>
                            <hr />
                            <p className="mb-1"><strong>Cargo:</strong> {user?.role_display}</p>
                            <p className="mb-1"><strong>Escola:</strong> {user?.school_name || 'N/A'}</p>
                            <p className="mb-0"><strong>Distrito:</strong> {user?.district_name || 'N/A'}</p>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={8}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                <FaLock /> Alterar senha
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {error && (
                                <Alert variant="danger" onClose={() => setError('')} dismissible>
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                                    {success}
                                </Alert>
                            )}

                            <Form onSubmit={handleChangePassword}>
                                <Form.Group className="mb-3" controlId="currentPassword">
                                    <Form.Label className="fw-bold">Senha atual</Form.Label>
                                    <Form.Control
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group controlId="newPassword">
                                            <Form.Label className="fw-bold">Nova senha</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group controlId="confirmPassword">
                                            <Form.Label className="fw-bold">Confirmar nova senha</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <div className="mt-4 text-end">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="d-inline-flex align-items-center gap-2"
                                        disabled={loading}
                                    >
                                        <FaSave />
                                        {loading ? 'A guardar...' : 'Guardar nova senha'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default MeuPerfil;


