import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { reportService } from '../../services/api';

const AdministrativoDashboard: React.FC = () => {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const data = await reportService.getSchoolSummary();
                setSummary(data);
            } catch (error) {
                console.error('Error fetching school summary:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    if (loading) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando visão administrativa...</div>;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Dashboard Administrativo</h2>
            <Row className="g-4">
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Gestão de Alunos</h6>
                            <h2 className="fw-bold mb-0">{summary?.total_alunos || 0}</h2>
                            <p className="text-muted small mt-2">Inscritos na escola</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Gestão de Turmas</h6>
                            <h2 className="fw-bold mb-0">{summary?.total_turmas || 0}</h2>
                            <p className="text-muted small mt-2">Atribuições ativas</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AdministrativoDashboard;
