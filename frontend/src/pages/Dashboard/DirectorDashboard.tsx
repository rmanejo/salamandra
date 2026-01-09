import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { institutionalService } from '../../services/api';

const DirectorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [blocked, setBlocked] = useState(user?.school_blocked || false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const data = await institutionalService.getDirectorDashboard();
                setStats(data);
            } catch (error) {
                console.error('Error fetching director dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const handleToggleLock = async () => {
        try {
            const response = await institutionalService.toggleSchoolLock();
            setBlocked(response.blocked);
        } catch (error) {
            console.error('Error toggling lock:', error);
        }
    };

    if (loading) return <div className="p-4">Carregando painel...</div>;

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-0">Dashboard do Director</h2>
                    <p className="text-secondary">{user?.school_name}</p>
                </div>
                <Button
                    variant={blocked ? "success" : "danger"}
                    onClick={handleToggleLock}
                    className="shadow-sm"
                >
                    {blocked ? "Desbloquear Escola" : "Bloquear Escola"}
                </Button>
            </div>
            <Row>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 mb-4 bg-white">
                        <Card.Body>
                            <Card.Title className="text-muted small text-uppercase fw-bold">Total de Alunos</Card.Title>
                            <h2 className="fw-bold">{stats?.total_alunos || 0}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 mb-4 bg-white">
                        <Card.Body>
                            <Card.Title className="text-muted small text-uppercase fw-bold">Corpo Docente</Card.Title>
                            <h2 className="fw-bold">{stats?.total_professores || 0}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 mb-4 bg-white">
                        <Card.Body>
                            <Card.Title className="text-muted small text-uppercase fw-bold">Aproveitamento Global</Card.Title>
                            <h2 className="fw-bold text-primary">{stats?.aproveitamento_global?.toFixed(1) || '0.0'}%</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 mb-4 bg-white">
                        <Card.Body>
                            <Card.Title className="text-muted small text-uppercase fw-bold">Status da Escola</Card.Title>
                            <h2 className={`fw-bold ${blocked ? "text-danger" : "text-success"}`}>
                                {blocked ? "BLOQUEADA" : "ATIVA"}
                            </h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-2">
                <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4 h-100">
                        <Card.Body>
                            <Card.Title className="h6 mb-4 fw-bold border-bottom pb-2">Aproveitamento por Classe (%)</Card.Title>
                            {stats?.aproveitamento_por_classe?.map((item: any) => (
                                <div key={item.classe} className="mb-3">
                                    <div className="d-flex justify-content-between mb-1">
                                        <span className="small fw-bold">{item.classe}</span>
                                        <span className="small text-primary">{item.media.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div
                                            className="progress-bar"
                                            role="progressbar"
                                            style={{ width: `${item.media}%` }}
                                            aria-valuenow={item.media}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        />
                                    </div>
                                </div>
                            )) || <p className="text-muted small">Sem dados disponíveis.</p>}
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4 h-100">
                        <Card.Body>
                            <Card.Title className="h6 mb-4 fw-bold border-bottom pb-2">Aproveitamento por Disciplina</Card.Title>
                            <div className="table-responsive">
                                <table className="table table-hover table-sm small">
                                    <thead>
                                        <tr>
                                            <th>Disciplina</th>
                                            <th className="text-end">Aproveitamento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.aproveitamento_por_disciplina?.map((item: any) => (
                                            <tr key={item.disciplina}>
                                                <td>{item.disciplina}</td>
                                                <td className="text-end fw-bold text-primary">{item.media.toFixed(1)}%</td>
                                            </tr>
                                        )) || <tr><td colSpan={2} className="text-center py-4">Sem dados disponíveis.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default DirectorDashboard;
