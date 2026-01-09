import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { academicRoleService } from '../../services/api';

const ProfessorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [dtData, setDtData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDTData = async () => {
            try {
                const data = await academicRoleService.getDTMinhaTurma();
                setDtData(data);
            } catch (error) {
                console.error('Error fetching DT data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDTData();
    }, []);

    if (loading) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando seus dados pedagógicos...</div>;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Painel do Professor</h2>

            {dtData ? (
                <>
                    <Card className="shadow-sm border-0 mb-4 bg-primary text-white">
                        <Card.Body className="p-4">
                            <h4 className="fw-bold mb-1">Director de Turma: {dtData.turma}</h4>
                            <p className="mb-0 opacity-75">{dtData.classe} | {user?.school_name}</p>
                        </Card.Body>
                    </Card>

                    <Row className="g-4">
                        <Col md={3}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Total Alunos</h6>
                                    <h3 className="fw-bold mb-0">{dtData.estatisticas?.total_alunos || 0}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Média da Turma</h6>
                                    <h3 className="fw-bold mb-0 text-primary">
                                        {dtData.estatisticas?.media_turma?.toFixed(1) || '0.0'}
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Faltas (Mês)</h6>
                                    <h3 className="fw-bold mb-0 text-danger">{dtData.estatisticas?.total_faltas || 0}</h3>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="shadow-sm border-0 text-center py-3">
                                <Card.Body>
                                    <h6 className="text-muted small text-uppercase">Aproveitamento</h6>
                                    <h3 className="fw-bold mb-0 text-success">
                                        {dtData.estatisticas?.percentagem_passagem || 0}%
                                    </h3>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            ) : (
                <Card className="shadow-sm border-0 bg-light text-center py-5">
                    <Card.Body>
                        <h5 className="text-muted">Bem-vindo, Prof. {user?.last_name || 'Utilizador'}</h5>
                        <p className="mb-0">Acesse as opções laterais para lançar notas ou faltas.</p>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
};

export default ProfessorDashboard;
