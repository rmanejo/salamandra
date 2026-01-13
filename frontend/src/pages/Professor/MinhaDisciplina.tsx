import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Accordion, Badge } from 'react-bootstrap';
import { academicRoleService } from '../../services/api';
import { FaChalkboardTeacher, FaBook, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const MinhaDisciplina: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const details = await academicRoleService.getDDDetalhes();
                setData(details);
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
            <h2 className="text-navy fw-bold mb-4">Minha Disciplina - Delegação</h2>

            {data.map((disc, idx) => (
                <Card key={idx} className="shadow-sm border-0 mb-4">
                    <Card.Header className="bg-primary text-white py-3">
                        <h4 className="mb-0 fw-bold"><FaBook className="me-2" /> {disc.disciplina}</h4>
                    </Card.Header>
                    <Card.Body>
                        <h5 className="text-muted mb-3">Professores e Turmas</h5>
                        <Accordion defaultActiveKey="0">
                            {disc.professores.map((prof: any, pIdx: number) => (
                                <Accordion.Item eventKey={String(pIdx)} key={prof.id}>
                                    <Accordion.Header>
                                        <FaChalkboardTeacher className="me-2 text-primary" />
                                        <span className="fw-bold">{prof.nome}</span>
                                        <Badge bg="secondary" className="ms-2">{prof.turmas.length} Turmas</Badge>
                                    </Accordion.Header>
                                    <Accordion.Body>
                                        <Row xs={1} sm={2} md={3} className="g-3">
                                            {prof.turmas.map((t: any) => (
                                                <Col key={t.id}>
                                                    <Card className="h-100 border bg-light">
                                                        <Card.Body className="d-flex flex-column">
                                                            <h6 className="fw-bold mb-1">{t.nome}</h6>
                                                            <small className="text-muted mb-3">{t.classe}</small>
                                                            <Button
                                                                variant="outline-dark"
                                                                size="sm"
                                                                className="mt-auto"
                                                                onClick={() => navigate(`/professor/notas?turma=${t.id}&disciplina=${disc.disciplina_id}`)}
                                                            >
                                                                <FaEye className="me-1" /> Ver Caderneta
                                                            </Button>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>
                                    </Accordion.Body>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Card.Body>
                </Card>
            ))}

            {data.length === 0 && (
                <div className="text-center py-5 text-muted">
                    Nenhuma delegação encontrada.
                </div>
            )}
        </Container>
    );
};

export default MinhaDisciplina;
