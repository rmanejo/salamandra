import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button, Badge } from 'react-bootstrap';
import { FaUserGraduate, FaChalkboardTeacher, FaUsers, FaClock, FaLock, FaUnlock } from 'react-icons/fa';
import { institutionalService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

interface DashboardData {
    total_alunos?: number;
    total_docentes?: number;
    total_tecnicos?: number;
    aproveitamento?: any;
    escola_bloqueada?: boolean;
    aproveitamento_por_classe?: any[];
    aproveitamento_por_disciplina?: any[];
}

const Dashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [toggling, setToggling] = useState(false);
    const { user } = useAuth();

    const fetchDashboard = async () => {
        try {
            const response = await institutionalService.getDashboard();
            setData(response);
        } catch (err: any) {
            console.error('Dashboard error:', err);
            setError('Erro ao carregar dados do dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const handleToggleLock = async () => {
        if (!data) return;
        setToggling(true);
        setError('');
        setSuccess('');
        
        try {
            const newLockStatus = !data.escola_bloqueada;
            await institutionalService.toggleSchoolLock(newLockStatus);
            setSuccess(`Escola ${newLockStatus ? 'bloqueada' : 'desbloqueada'} com sucesso!`);
            await fetchDashboard();
        } catch (err: any) {
            console.error('Toggle lock error:', err);
            setError(err.response?.data?.error || 'Erro ao alterar status da escola');
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return (
            <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    if (error) {
        return (
            <Container fluid>
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    const isDirector = user?.role === 'ADMIN_ESCOLA';
    const escolaBloqueada = data?.escola_bloqueada || false;
    
    // Calcular aproveitamento médio se disponível
    let aproveitamentoMedio = '-';
    if (data?.aproveitamento_por_classe && data.aproveitamento_por_classe.length > 0) {
        const total = data.aproveitamento_por_classe.reduce((acc: number, item: any) => acc + (item.media || 0), 0);
        aproveitamentoMedio = (total / data.aproveitamento_por_classe.length).toFixed(1);
    }

    const stats = [
        { title: 'Total de Alunos', value: data?.total_alunos?.toString() || '0', icon: <FaUserGraduate size={24} />, color: 'success' },
        { title: 'Total de Docentes', value: data?.total_docentes?.toString() || '0', icon: <FaChalkboardTeacher size={24} />, color: 'primary' },
        { title: 'Pessoal Técnico', value: data?.total_tecnicos?.toString() || '0', icon: <FaUsers size={24} />, color: 'dark' },
        { title: 'Aproveitamento Médio', value: `${aproveitamentoMedio}%`, icon: <FaClock size={24} />, color: 'warning' },
    ];

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Dashboard - Visão Geral</h2>
                    <p className="text-secondary">Acompanhe as principais métricas do sistema em tempo real</p>
                </div>
                {isDirector && (
                    <div className="d-flex align-items-center gap-3">
                        <Badge bg={escolaBloqueada ? 'danger' : 'success'} className="px-3 py-2">
                            {escolaBloqueada ? 'Escola Bloqueada' : 'Escola Ativa'}
                        </Badge>
                        <Button
                            variant={escolaBloqueada ? 'success' : 'danger'}
                            onClick={handleToggleLock}
                            disabled={toggling}
                            className="d-flex align-items-center gap-2"
                        >
                            {escolaBloqueada ? <FaUnlock /> : <FaLock />}
                            {toggling ? 'Processando...' : escolaBloqueada ? 'Desbloquear Escola' : 'Bloquear Escola'}
                        </Button>
                    </div>
                )}
            </div>

            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Row className="g-4 mb-5">
                {stats.map((stat, index) => (
                    <Col key={index} md={6} lg={3}>
                        <Card className="border-0 shadow-sm h-100 stat-card">
                            <Card.Body className="d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="fs-1 fw-bold mb-0">{stat.value}</div>
                                    <div className="text-secondary small">{stat.title}</div>
                                </div>
                                <div className={`stat-icon bg-light text-${stat.color} rounded-3 p-3`}>
                                    {stat.icon}
                                </div>
                            </Card.Body>
                            <div className={`card-progress bg-${stat.color}`} />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="g-4">
                {data?.aproveitamento_por_classe && data.aproveitamento_por_classe.length > 0 && (
                    <Col lg={6}>
                        <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-white py-3 border-0">
                                <h5 className="mb-0 fw-bold">Aproveitamento por Classe</h5>
                                <small className="text-muted">Média de aproveitamento por classe</small>
                            </Card.Header>
                            <Card.Body>
                                {data.aproveitamento_por_classe.map((item: any, idx: number) => (
                                    <div key={idx} className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <div>
                                            <div className="fw-bold">{item.classe || 'N/A'}</div>
                                            <small className="text-muted">{item.total_alunos || 0} alunos</small>
                                        </div>
                                        <div className="text-end">
                                            <div className="fs-4 fw-bold text-primary">{item.media?.toFixed(1) || '0.0'}%</div>
                                        </div>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    </Col>
                )}
                {data?.aproveitamento_por_disciplina && data.aproveitamento_por_disciplina.length > 0 && (
                    <Col lg={6}>
                        <Card className="border-0 shadow-sm">
                            <Card.Header className="bg-white py-3 border-0">
                                <h5 className="mb-0 fw-bold">Aproveitamento por Disciplina</h5>
                                <small className="text-muted">Top 5 disciplinas</small>
                            </Card.Header>
                            <Card.Body>
                                {data.aproveitamento_por_disciplina.slice(0, 5).map((item: any, idx: number) => (
                                    <div key={idx} className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                                        <div>
                                            <div className="fw-bold">{item.disciplina || 'N/A'}</div>
                                            <small className="text-muted">{item.total_avaliacoes || 0} avaliações</small>
                                        </div>
                                        <div className="text-end">
                                            <div className="fs-4 fw-bold text-success">{item.media?.toFixed(1) || '0.0'}%</div>
                                        </div>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>
        </Container>
    );
};

export default Dashboard;
