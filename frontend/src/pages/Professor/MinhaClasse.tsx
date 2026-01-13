import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { academicRoleService } from '../../services/api';
import { FaThLarge, FaUserGraduate, FaArrowRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const MinhaClasse: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const turmas = await academicRoleService.getCCTurmas();
                setData(turmas);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;

    return (
        <Container fluid className="py-4">
            <h2 className="text-navy fw-bold mb-4">Minha Classe - Coordenação</h2>

            {data.map((classeGroup, idx) => (
                <div key={idx} className="mb-5">
                    <h4 className="border-bottom pb-2 mb-3">{classeGroup.classe}</h4>
                    <Row xs={1} md={2} lg={3} className="g-4">
                        {classeGroup.turmas.map((turma: any) => (
                            <Col key={turma.id}>
                                <Card className="shadow-sm border-0 h-100 hover-card">
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <h5 className="fw-bold mb-0 text-primary">{turma.nome}</h5>
                                            <span className="text-muted small">{turma.ano_letivo}</span>
                                        </div>

                                        <div className="mb-3">
                                            <div className="d-flex align-items-center text-muted mb-2">
                                                <FaUserGraduate className="me-2" />
                                                <span>{turma.total_alunos} Alunos</span>
                                            </div>
                                            <div className="d-flex align-items-center text-muted">
                                                <FaThLarge className="me-2" />
                                                <span>DT: {turma.director_turma}</span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline-primary"
                                            className="w-100 d-flex justify-content-between align-items-center"
                                            onClick={() => navigate(`/professor/ver-pauta/${turma.id}`)}
                                        >
                                            Ver Pauta
                                            <FaArrowRight />
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            ))}

            {data.length === 0 && (
                <div className="text-center py-5 text-muted">
                    Nenhuma classe coordenada encontrada.
                </div>
            )}
        </Container>
    );
};

export default MinhaClasse;
