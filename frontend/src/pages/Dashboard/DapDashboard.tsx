import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { reportService, daeService, institutionalService } from '../../services/api';

const DapDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                const [summary, alunos, disciplinas, aproveitamento, directorStats] = await Promise.all([
                    reportService.getSchoolSummary(),
                    daeService.getStatsAlunos(),
                    daeService.getStatsDisciplinas(),
                    daeService.getStatsAproveitamento(),
                    institutionalService.getDirectorDashboard()
                ]);
                setStats({ summary, alunos, disciplinas, aproveitamento, directorStats });
            } catch (error) {
                console.error('Error fetching combined pedagogical stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, []);

    if (loading) return (
        <div className="p-4 text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Carregando visão pedagógica unificada...</p>
        </div>
    );

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Gestão Pedagógica (DAP/DAE)</h2>

            {/* Resumo Geral */}
            <Row className="g-4 mb-4">
                <Col md={3}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Total de Alunos</h6>
                            <h2 className="fw-bold mb-0">{stats?.summary?.total_alunos || 0}</h2>
                            <div className="mt-1 small text-muted">
                                {stats?.alunos?.por_sexo?.find((s: any) => s.sexo === 'HOMEM')?.total || 0} H |
                                {stats?.alunos?.por_sexo?.find((s: any) => s.sexo === 'MULHER')?.total || 0} M
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Total de Turmas</h6>
                            <h2 className="fw-bold mb-0">{stats?.summary?.total_turmas || 0}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Corpo Docente</h6>
                            <h2 className="fw-bold mb-0">{stats?.summary?.total_professores || 0}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body>
                            <h6 className="text-muted small text-uppercase">Aproveitamento Global</h6>
                            <h2 className="fw-bold mb-0 text-primary">
                                {stats?.aproveitamento?.media_geral?.toFixed(1) || '0.0'}%
                            </h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4">
                {/* Aproveitamento por Classe */}
                <Col md={8}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white border-bottom py-3">
                            <h6 className="mb-0 fw-bold text-navy">Aproveitamento por Classe</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Classe</th>
                                            <th className="text-center">Alunos</th>
                                            <th className="text-center">Aprovados</th>
                                            <th className="text-center">Percentagem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.aproveitamento?.por_classe?.map((c: any) => (
                                            <tr key={c.classe}>
                                                <td className="fw-bold">{c.classe}</td>
                                                <td className="text-center">{c.total}</td>
                                                <td className="text-center">{c.aprovados}</td>
                                                <td className="text-center">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="progress flex-grow-1" style={{ height: '6px' }}>
                                                            <div
                                                                className={`progress-bar ${c.percentagem >= 50 ? 'bg-success' : 'bg-warning'}`}
                                                                style={{ width: `${c.percentagem}%` }}
                                                            />
                                                        </div>
                                                        <span className="small fw-bold">{c.percentagem.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) || <tr><td colSpan={4} className="text-center py-4">Sem dados de aproveitamento.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Alunos por Classe */}
                <Col md={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white border-bottom py-3">
                            <h6 className="mb-0 fw-bold text-navy">Distribuição de Alunos</h6>
                        </Card.Header>
                        <Card.Body>
                            <ul className="list-group list-group-flush">
                                {stats?.alunos?.por_classe?.map((pc: any) => (
                                    <li key={pc.classe_atual__nome} className="list-group-item d-flex justify-content-between align-items-center px-0">
                                        {pc.classe_atual__nome}
                                        <span className="badge bg-light text-navy rounded-pill">{pc.total} alunos</span>
                                    </li>
                                )) || <p className="text-muted small">Sem dados de distribuição.</p>}
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Aproveitamento por Disciplina */}
            <Row className="g-4 mt-2 mb-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white border-bottom py-3">
                            <h6 className="mb-0 fw-bold text-navy">Aproveitamento por Disciplina</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Disciplina</th>
                                            <th className="text-center">Aproveitamento (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.directorStats?.aproveitamento_por_disciplina?.map((item: any) => (
                                            <tr key={item.disciplina}>
                                                <td className="fw-bold">{item.disciplina}</td>
                                                <td className="text-center">
                                                    <div className="d-flex align-items-center gap-2 justify-content-center">
                                                        <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '300px' }}>
                                                            <div
                                                                className={`progress-bar ${item.media >= 50 ? 'bg-success' : 'bg-warning'}`}
                                                                style={{ width: `${item.media}%` }}
                                                            />
                                                        </div>
                                                        <span className="small fw-bold">{item.media.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) || <tr><td colSpan={2} className="text-center py-4 text-muted">Aguardando lançamento de notas...</td></tr>}
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

export default DapDashboard;
