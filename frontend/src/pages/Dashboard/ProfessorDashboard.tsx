import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { academicRoleService } from '../../services/api';

const ProfessorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [dtData, setDtData] = useState<any>(null);
    const [ccData, setCcData] = useState<any[]>([]);
    const [ddData, setDdData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [trimestre, setTrimestre] = useState<number | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch DT Data
                try {
                    const dt = await academicRoleService.getDTMinhaTurma(
                        trimestre ? { trimestre } : undefined
                    );
                    setDtData(dt);
                } catch (e) {
                    // Ignore if not DT
                }

                // Fetch CC Data
                try {
                    const cc = await academicRoleService.getCCResumoClasse();
                    if (Array.isArray(cc)) setCcData(cc);
                } catch (e) {
                    // Ignore if not CC
                }

                // Fetch DD Data
                try {
                    const dd = await academicRoleService.getDDResumoDisciplina();
                    if (Array.isArray(dd)) setDdData(dd);
                } catch (e) {
                    // Ignore if not DD
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [trimestre]);

    useEffect(() => {
        if (user?.school_current_trimestre) {
            setTrimestre(user.school_current_trimestre);
        }
    }, [user]);

    if (loading) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando seus dados pedagógicos...</div>;

    const hasRoles = dtData || ccData.length > 0 || ddData.length > 0;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Painel do Professor</h2>

            {!hasRoles && (
                <Card className="shadow-sm border-0 bg-light text-center py-5">
                    <Card.Body>
                        <h5 className="text-muted">Bem-vindo, Prof. {user?.last_name || 'Utilizador'}</h5>
                        <p className="mb-0">Acesse as opções laterais para lançar notas ou faltas.</p>
                    </Card.Body>
                </Card>
            )}

            {dtData && (
                <div className="mb-5">
                    <Card className="shadow-sm border-0 mb-4 bg-primary text-white">
                        <Card.Body className="p-4">
                            <h4 className="fw-bold mb-1">Director de Turma: {dtData.turma}</h4>
                            <p className="mb-0 opacity-75">
                                {dtData.classe} | {user?.school_name} | Trimestre: {trimestre ?? '-'}
                            </p>
                        </Card.Body>
                    </Card>

                    <Row className="g-4">
                        <Col md={4}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Total Alunos</h6>
                                    <h3 className="fw-bold mb-0">{dtData.estatisticas?.total_alunos || 0}</h3>
                                    <div className="text-muted small mt-1">
                                        H: {dtData.estatisticas?.homens || 0} | M: {dtData.estatisticas?.mulheres || 0}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Aprovados</h6>
                                    <h3 className="fw-bold mb-0 text-success">{dtData.estatisticas?.aprovados?.total || 0}</h3>
                                    <div className="text-muted small mt-1">
                                        H: {dtData.estatisticas?.aprovados?.homens || 0} | M: {dtData.estatisticas?.aprovados?.mulheres || 0}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Aproveitamento</h6>
                                    <h3 className="fw-bold mb-0 text-primary">
                                        {dtData.estatisticas?.percentagem_aprovacao?.total?.toFixed(1) || '0.0'}%
                                    </h3>
                                    <div className="text-muted small mt-1">
                                        H: {dtData.estatisticas?.percentagem_aprovacao?.homens?.toFixed(1) || '0.0'}% |
                                        M: {dtData.estatisticas?.percentagem_aprovacao?.mulheres?.toFixed(1) || '0.0'}%
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </div>
            )}

            {ccData.length > 0 && (
                <div className="mb-5">
                    <h4 className="text-navy fw-bold mb-3 border-bottom pb-2">Coordenação de Classe</h4>
                    {ccData.map((cc, idx) => (
                        <div key={idx} className="mb-4">
                            <Card className="shadow-sm border-0 mb-3 bg-secondary text-white">
                                <Card.Body className="p-3">
                                    <h5 className="fw-bold mb-0">{cc.classe}</h5>
                                </Card.Body>
                            </Card>
                            <Row className="g-4">
                                <Col md={3}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">Total Turmas</h6>
                                            <h3 className="fw-bold mb-0">{cc.total_turmas || 0}</h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">Total Alunos</h6>
                                            <h3 className="fw-bold mb-0">{cc.total_alunos || 0}</h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">Média Global</h6>
                                            <h3 className="fw-bold mb-0 text-primary">
                                                {cc.media_global?.toFixed(1) || '0.0'}
                                            </h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">Aprovados</h6>
                                            <h3 className="fw-bold mb-0 text-success">
                                                {cc.percentagem_aprovacao?.toFixed(1) || 0}%
                                            </h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    ))}
                </div>
            )}

            {ddData.length > 0 && (
                <div className="mb-5">
                    <h4 className="text-navy fw-bold mb-3 border-bottom pb-2">Delegação de Disciplina</h4>
                    {ddData.map((dd, idx) => (
                        <div key={idx} className="mb-4">
                            <Card className="shadow-sm border-0 mb-3 bg-info text-white">
                                <Card.Body className="p-3">
                                    <h5 className="fw-bold mb-0">{dd.disciplina}</h5>
                                </Card.Body>
                            </Card>
                            <Row className="g-4">
                                <Col md={4}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">Média Geral</h6>
                                            <h3 className="fw-bold mb-0 text-primary">
                                                {dd.media_geral?.toFixed(1) || '0.0'}
                                            </h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">% Positivas</h6>
                                            <h3 className="fw-bold mb-0 text-success">
                                                {dd.percentagem_positivas?.toFixed(1) || 0}%
                                            </h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="shadow-sm border-0 text-center py-3">
                                        <Card.Body>
                                            <h6 className="text-muted small text-uppercase">Melhor Turma</h6>
                                            <h3 className="fw-bold mb-0 text-dark">
                                                {dd.melhor_turma || '-'}
                                            </h3>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    ))}
                </div>
            )}

        </Container>
    );
};

export default ProfessorDashboard;
