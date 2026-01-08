import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaFileDownload, FaPrint, FaSearch } from 'react-icons/fa';
import { reportService, academicService } from '../../services/api';

interface Turma {
    id: number;
    nome: string;
    classe?: any;
}

interface Disciplina {
    id: number;
    nome: string;
}

interface PautaItem {
    nome: string;
    trimesters: {
        [key: string]: {
            acs: number[];
            map: number;
            macs: number;
            acp: number;
            mt: number;
            com: string;
        };
    };
    mfd: number;
}

interface PautaData {
    turma: string;
    disciplina: string;
    classe: string;
    ano_letivo: number;
    pauta: PautaItem[];
}

const Relatorios: React.FC = () => {
    const [turmaId, setTurmaId] = useState('');
    const [disciplinaId, setDisciplinaId] = useState('');
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [pauta, setPauta] = useState<PautaData | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const [turmasData, disciplinasData] = await Promise.all([
                    academicService.getTurmas(),
                    academicService.getDisciplinas()
                ]);
                setTurmas(Array.isArray(turmasData) ? turmasData : []);
                setDisciplinas(Array.isArray(disciplinasData) ? disciplinasData : []);
            } catch (err: any) {
                console.error('Error fetching data:', err);
                setError('Erro ao carregar turmas e disciplinas');
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const handleGeneratePauta = async () => {
        if (!turmaId || !disciplinaId) {
            setError('Por favor, selecione turma e disciplina');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const data = await reportService.getClassReport({
                turma_id: parseInt(turmaId),
                disciplina_id: parseInt(disciplinaId)
            });
            setPauta(data);
        } catch (err: any) {
            console.error('Error generating pauta:', err);
            setError(err.response?.data?.error || 'Erro ao gerar pauta');
            setPauta(null);
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Pauta Trimestral</h2>
                    <p className="text-secondary">Visualize e exporte o rendimento pedagógico das turmas</p>
                </div>
                {pauta && (
                    <div className="d-flex gap-2">
                        <Button variant="outline-dark" className="d-flex align-items-center gap-2" onClick={() => window.print()}>
                            <FaPrint /> Imprimir
                        </Button>
                        <Button variant="success" className="d-flex align-items-center gap-2" disabled>
                            <FaFileDownload /> Exportar Excel
                        </Button>
                    </div>
                )}
            </div>

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                    <Row className="g-3 align-items-end">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Turma</Form.Label>
                                <Form.Select 
                                    value={turmaId} 
                                    onChange={(e) => {
                                        setTurmaId(e.target.value);
                                        setPauta(null);
                                    }}
                                    disabled={loading}
                                >
                                    <option value="">Selecionar Turma...</option>
                                    {turmas.map((turma) => (
                                        <option key={turma.id} value={turma.id}>
                                            {turma.nome} {turma.classe?.nome ? `(${turma.classe.nome})` : ''}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Disciplina</Form.Label>
                                <Form.Select 
                                    value={disciplinaId} 
                                    onChange={(e) => {
                                        setDisciplinaId(e.target.value);
                                        setPauta(null);
                                    }}
                                    disabled={loading}
                                >
                                    <option value="">Selecionar Disciplina...</option>
                                    {disciplinas.map((disciplina) => (
                                        <option key={disciplina.id} value={disciplina.id}>
                                            {disciplina.nome}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Button 
                                variant="primary" 
                                className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                                onClick={handleGeneratePauta}
                                disabled={loading || !turmaId || !disciplinaId}
                            >
                                {loading ? <Spinner size="sm" /> : <FaSearch />} 
                                {loading ? 'Gerando...' : 'Gerar Pauta'}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {pauta && pauta.pauta && pauta.pauta.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-0 py-3">
                        <div className="text-center">
                            <h5 className="mb-0 fw-bold text-navy">Pauta de Avaliação</h5>
                            <small className="text-muted">
                                {pauta.turma} - {pauta.disciplina} | {pauta.classe} | Ano Letivo: {pauta.ano_letivo}
                            </small>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <Table bordered responsive hover className="mb-0 text-center align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th rowSpan={2} className="align-middle border-bottom-0 ps-4 text-start">Nº e Nome do Aluno</th>
                                    <th colSpan={6}>1º Trimestre</th>
                                    <th rowSpan={2} className="align-middle border-bottom-0">MFD</th>
                                </tr>
                                <tr>
                                    <th>ACS</th>
                                    <th>MAP</th>
                                    <th>MAC</th>
                                    <th>ACP</th>
                                    <th>MT</th>
                                    <th>COM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pauta.pauta.map((item, idx) => {
                                    const trim1 = item.trimesters['1'];
                                    if (!trim1) return null;
                                    return (
                                        <tr key={idx}>
                                            <td className="ps-4 text-start fw-bold">{idx + 1}. {item.nome}</td>
                                            <td>{trim1.acs && trim1.acs.length > 0 ? trim1.acs.join(' / ') : '-'}</td>
                                            <td>{trim1.map || '-'}</td>
                                            <td className="bg-light">{trim1.macs || '-'}</td>
                                            <td>{trim1.acp || '-'}</td>
                                            <td className="fw-bold bg-light">{trim1.mt || '-'}</td>
                                            <td>{trim1.com || '-'}</td>
                                            <td className="fw-bold text-primary">{item.mfd || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {pauta && (!pauta.pauta || pauta.pauta.length === 0) && (
                <Alert variant="info" className="text-center">
                    Nenhum dado encontrado para esta turma e disciplina.
                </Alert>
            )}
        </Container>
    );
};

export default Relatorios;
