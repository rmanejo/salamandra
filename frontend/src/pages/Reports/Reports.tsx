import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Spinner } from 'react-bootstrap';
import { FaFilePdf, FaFileExcel, FaSearch } from 'react-icons/fa';
import { academicService, reportService } from '../../services/api';

const Reports: React.FC = () => {
    const [turmas, setTurmas] = useState<any[]>([]);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [selectedTurma, setSelectedTurma] = useState('');
    const [selectedDisciplina, setSelectedDisciplina] = useState('');
    const [selectedTrimestre, setSelectedTrimestre] = useState('1');
    const [pautaData, setPautaData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetchingBase, setFetchingBase] = useState(true);

    useEffect(() => {
        const fetchBaseData = async () => {
            try {
                const [turmasRes, disciplinasRes] = await Promise.all([
                    academicService.getTurmas(),
                    academicService.getDisciplinas()
                ]);
                setTurmas(Array.isArray(turmasRes) ? turmasRes : turmasRes.results || []);
                setDisciplinas(Array.isArray(disciplinasRes) ? disciplinasRes : disciplinasRes.results || []);
            } catch (error) {
                console.error('Error fetching base data for reports:', error);
            } finally {
                setFetchingBase(false);
            }
        };
        fetchBaseData();
    }, []);

    const handleGeneratePauta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTurma || !selectedDisciplina) return;

        setLoading(true);
        try {
            const data = await reportService.getClassReport({
                turma_id: parseInt(selectedTurma),
                disciplina_id: parseInt(selectedDisciplina)
            });
            setPautaData(data);
        } catch (error) {
            console.error('Error generating pauta:', error);
            alert('Erro ao gerar pauta. Verifique se os dados estão corretos.');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingBase) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando opções...</div>;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Relatórios e Pautas</h2>

            <Row className="mb-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Filtros para Pauta Trimestral</h6>
                            <Form className="row g-3" onSubmit={handleGeneratePauta}>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold">Turma</Form.Label>
                                        <Form.Select
                                            value={selectedTurma}
                                            onChange={(e) => setSelectedTurma(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecionar Turma</option>
                                            {turmas.map(t => (
                                                <option key={t.id} value={t.id}>{t.nome} - {t.classe_nome || t.classe}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold">Disciplina</Form.Label>
                                        <Form.Select
                                            value={selectedDisciplina}
                                            onChange={(e) => setSelectedDisciplina(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecionar Disciplina</option>
                                            {disciplinas.map(d => (
                                                <option key={d.id} value={d.id}>{d.nome}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold">Trimestre</Form.Label>
                                        <Form.Select
                                            value={selectedTrimestre}
                                            onChange={(e) => setSelectedTrimestre(e.target.value)}
                                        >
                                            <option value="1">1º Trimestre</option>
                                            <option value="2">2º Trimestre</option>
                                            <option value="3">3º Trimestre</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3} className="d-flex align-items-end">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                        disabled={loading}
                                    >
                                        {loading ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                                        Gerar Pauta
                                    </Button>
                                </Col>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {pautaData && (
                <Row>
                    <Col md={12}>
                        <Card className="shadow-sm border-0 bg-white">
                            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                                <div>
                                    <h5 className="mb-0 fw-bold">{pautaData.disciplina} - {pautaData.turma}</h5>
                                    <small className="text-secondary">{pautaData.escola} | Ano: {pautaData.ano_letivo}</small>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button variant="outline-danger" size="sm" className="d-flex align-items-center gap-2 px-3">
                                        <FaFilePdf /> PDF
                                    </Button>
                                    <Button variant="outline-success" size="sm" className="d-flex align-items-center gap-2 px-3">
                                        <FaFileExcel /> Excel
                                    </Button>
                                </div>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table hover className="mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-3">Nome do Aluno</th>
                                                <th className="text-center">ACSs</th>
                                                <th className="text-center">MAP</th>
                                                <th className="text-center">MACS</th>
                                                <th className="text-center">ACP</th>
                                                <th className="text-center">MT</th>
                                                <th className="text-center">Resultado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pautaData.pauta.map((aluno: any) => {
                                                const triData = aluno.trimesters[selectedTrimestre];
                                                return (
                                                    <tr key={aluno.id}>
                                                        <td className="ps-3 fw-medium">{aluno.nome}</td>
                                                        <td className="text-center small">
                                                            {triData.acs.join(', ') || '-'}
                                                        </td>
                                                        <td className="text-center">{triData.map ?? '-'}</td>
                                                        <td className="text-center fw-bold">{triData.macs}</td>
                                                        <td className="text-center">{triData.acp ?? '-'}</td>
                                                        <td className="text-center text-primary fw-bold">
                                                            {triData.mt ?? '-'}
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`badge ${triData.mt >= 10 ? 'bg-success' : 'bg-danger'}`}>
                                                                {triData.mt >= 10 ? 'Aprovado' : triData.mt !== null ? 'Reprovado' : '-'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default Reports;
