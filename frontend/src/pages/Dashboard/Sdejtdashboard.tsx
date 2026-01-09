import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Table } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/api';

const Sdejtdashboard: React.FC = () => {
    const { user } = useAuth();
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchools = async () => {
            try {
                const data = await adminService.getSchools();
                setSchools(data);
            } catch (error) {
                console.error('Error fetching SDEJT schools:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSchools();
    }, []);

    if (loading) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando escolas do distrito...</div>;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-0 text-navy fw-bold">Gestão Distrital (SDEJT)</h2>
            <p className="text-secondary mb-4">{user?.district_name}</p>

            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm border-0 border-start border-primary border-4">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Escolas Supervisionadas</h6>
                            <h3 className="fw-bold mb-0">{schools.length}</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3 border-bottom h6 fw-bold">
                    Lista de Escolas no Distrito
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive">
                        <Table hover className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th className="ps-3">Nome da Escola</th>
                                    <th>Tipo</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map((school: any) => (
                                    <tr key={school.id}>
                                        <td className="ps-3 fw-medium">{school.name}</td>
                                        <td>{school.school_type_display || school.school_type}</td>
                                        <td>
                                            <span className={`badge ${school.blocked ? 'bg-danger' : 'bg-success'}`}>
                                                {school.blocked ? 'Bloqueada' : 'Ativa'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {schools.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center py-4 text-muted">Nenhuma escola encontrada.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Sdejtdashboard;
