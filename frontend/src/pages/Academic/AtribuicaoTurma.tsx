
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { academicService } from '../../services/api';

const AtribuicaoTurma: React.FC = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [turmas, setTurmas] = useState<any[]>([]);
    const [professores, setProfessores] = useState<any[]>([]);

    const [selectedClasse, setSelectedClasse] = useState('');
    const [selectedTurma, setSelectedTurma] = useState('');

    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedTurma) {
            fetchDisciplinas(selectedTurma);
        } else {
            setDisciplinas([]);
        }
    }, [selectedTurma]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [classesData, turmasData, profData] = await Promise.all([
                academicService.getClasses(),
                academicService.getTurmas(),
                academicService.getTeachers()
            ]);
            setClasses(classesData);
            setTurmas(turmasData);
            setProfessores(profData);
        } catch (err: any) {
            setError('Erro ao carregar dados iniciais.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDisciplinas = async (turmaId: string) => {
        setLoadingDisciplinas(true);
        try {
            // New endpoint we created: GET /academico/turmas/{id}/disciplinas/
            // Need to update api.ts to include this call strictly, or use generic axios here?
            // Let's assume we add getTurmaDisciplinas to api.ts or use generic get
            // For now using direct axios via the imported api instance if possible or add to academicService
            // Waiting for api.ts update, let's assume academicService.getTurmaDisciplinas(id)

            // NOTE: I haven't added getTurmaDisciplinas to api.ts yet. 
            // I will do it in parallel or assume it exists and fix api.ts next.
            const data = await academicService.getTurmaDisciplinas(parseInt(turmaId));
            setDisciplinas(data);
        } catch (err) {
            setError('Erro ao buscar disciplinas da turma.');
        } finally {
            setLoadingDisciplinas(false);
        }
    };

    const getProfessoresPorDisciplina = (disciplinaId: number) => {
        return professores.filter(p => Array.isArray(p.disciplina_ids) && p.disciplina_ids.includes(disciplinaId));
    };

    const handleAssign = async (disciplinaId: number, professorId: string) => {
        try {
            await academicService.atribuirProfessor(parseInt(selectedTurma), {
                disciplina_id: disciplinaId,
                professor_id: professorId ? parseInt(professorId) : null
            });
            setSuccess('Atribuição atualizada com sucesso!');
            fetchDisciplinas(selectedTurma); // Refresh
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atribuir professor.');
        }
    };

    const filteredTurmas = selectedClasse
        ? turmas.filter(t => t.classe.id === parseInt(selectedClasse))
        : turmas;

    return (
        <Container fluid className="py-2">
            <h2 className="mb-4 fw-bold">Atribuição de Professores por Turma</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="mb-4 shadow-sm border-0">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Classe</Form.Label>
                                <Form.Select value={selectedClasse} onChange={e => {
                                    setSelectedClasse(e.target.value);
                                    setSelectedTurma('');
                                }}>
                                    <option value="">Todas as Classes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Turma</Form.Label>
                                <Form.Select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)} disabled={loading}>
                                    <option value="">Selecionar Turma...</option>
                                    {filteredTurmas.map(t => <option key={t.id} value={t.id}>{t.nome} - {t.ano_letivo}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {selectedTurma && (
                <Card className="shadow-sm border-0">
                    <Card.Header className="bg-white py-3">
                        <h5 className="mb-0 fw-bold">Disciplinas da Turma</h5>
                    </Card.Header>
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th>Disciplina</th>
                                <th>Professor Atual</th>
                                <th style={{ width: '35%' }}>Nova Atribuição</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingDisciplinas ? (
                                <tr><td colSpan={3} className="text-center py-4"><Spinner size="sm" /> Carregando...</td></tr>
                            ) : disciplinas.length === 0 ? (
                                <tr><td colSpan={3} className="text-center py-4 text-muted">Nenhuma disciplina encontrada.</td></tr>
                            ) : (
                                disciplinas.map(disc => (
                                    <tr key={disc.id}>
                                        <td className="fw-bold">{disc.nome}</td>
                                        <td>
                                            {disc.professor_nome ? (
                                                <span className="text-success fw-bold">{disc.professor_nome}</span>
                                            ) : (
                                                <span className="text-warning">-- Sem Professor --</span>
                                            )}
                                        </td>
                                        <td>
                                            <Form.Select
                                                size="sm"
                                                value={disc.professor_id || ''}
                                                onChange={(e) => handleAssign(disc.id, e.target.value)}
                                            >
                                                <option value="">Sem Professor</option>
                                                {getProfessoresPorDisciplina(disc.id).map((p: any) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.full_name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            {getProfessoresPorDisciplina(disc.id).length === 0 && (
                                                <div className="small text-muted mt-1">Sem professores para esta disciplina.</div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card>
            )}
        </Container>
    );
};

export default AtribuicaoTurma;
