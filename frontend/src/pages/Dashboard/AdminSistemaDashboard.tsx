import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { adminService } from '../../services/api';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>({
        schools: [],
        districts: [],
        loading: true
    });

    useEffect(() => {
        const fetchGlobalData = async () => {
            try {
                const [schoolsRes, districtsRes] = await Promise.all([
                    adminService.getSchools(),
                    adminService.getDistricts()
                ]);

                const schools = Array.isArray(schoolsRes) ? schoolsRes : schoolsRes.results || [];
                const districts = Array.isArray(districtsRes) ? districtsRes : districtsRes.results || [];

                setStats({
                    schools,
                    districts,
                    loading: false
                });
            } catch (error) {
                console.error('Error fetching global admin data:', error);
                setStats((prev: any) => ({ ...prev, loading: false }));
            }
        };
        fetchGlobalData();
    }, []);

    if (stats.loading) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando visão global...</div>;

    const blockedSchools = stats.schools.filter((s: any) => s.blocked).length;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Gestão do Sistema (Admin)</h2>
            <Row className="g-4">
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 bg-primary text-white">
                        <Card.Body className="py-4">
                            <h6 className="text-uppercase small opacity-75">Total de Escolas</h6>
                            <h2 className="fw-bold mb-0">{stats.schools.length}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 bg-info text-white">
                        <Card.Body className="py-4">
                            <h6 className="text-uppercase small opacity-75">Distritos</h6>
                            <h2 className="fw-bold mb-0">{stats.districts.length}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 bg-danger text-white">
                        <Card.Body className="py-4">
                            <h6 className="text-uppercase small opacity-75">Escolas Bloqueadas</h6>
                            <h2 className="fw-bold mb-0">{blockedSchools}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center shadow-sm border-0 bg-success text-white">
                        <Card.Body className="py-4">
                            <h6 className="text-uppercase small opacity-75">Sistema</h6>
                            <h2 className="fw-bold mb-0">ON</h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AdminDashboard;
