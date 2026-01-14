
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Alert, Row, Col, Badge } from 'react-bootstrap';
import { academicService } from '../../services/api';

const AtribuicaoProfessor: React.FC = () => {
    const [professores, setProfessores] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [turmas, setTurmas] = useState<any[]>([]);

    const [selectedProfessor, setSelectedProfessor] = useState('');
    const [assignments, setAssignments] = useState<any[]>([]);

    // New Assignment Form State
    const [selectedClasse, setSelectedClasse] = useState('');
    const [selectedTurma, setSelectedTurma] = useState('');
    const [turmaDisciplinas, setTurmaDisciplinas] = useState<any[]>([]);
    const [selectedDisciplina, setSelectedDisciplina] = useState('');
    const [bulkAssigning, setBulkAssigning] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedProfessor) {
            fetchAssignments(selectedProfessor);
        } else {
            setAssignments([]);
        }
    }, [selectedProfessor]);

    useEffect(() => {
        if (selectedTurma) {
            fetchTurmaDisciplinas(selectedTurma);
        } else {
            setTurmaDisciplinas([]);
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

    const fetchAssignments = async (profId: string) => {
        try {
            const data = await academicService.getTeacherAssignments(parseInt(profId));
            setAssignments(data);
        } catch (err) {
            setError('Erro ao buscar atribuições do professor.');
        }
    };

    const fetchTurmaDisciplinas = async (turmaId: string) => {
        try {
            const data = await academicService.getTurmaDisciplinas(parseInt(turmaId));
            setTurmaDisciplinas(data);
        } catch (err) {
            setError('Erro ao buscar disciplinas da turma.');
        }
    };

    const handleAddAssignment = async () => {
        if (!selectedTurma || !selectedDisciplina || !selectedProfessor) return;

        try {
            await academicService.atribuirProfessor(parseInt(selectedTurma), {
                disciplina_id: parseInt(selectedDisciplina),
                professor_id: parseInt(selectedProfessor)
            });
            setSuccess('Atribuição adicionada com sucesso!');
            fetchAssignments(selectedProfessor); // Refresh list
            // Clean up form
            setSelectedDisciplina('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atribuir.');
        }
    };

    const handleAssignAllFreeTurmas = async () => {
        if (!selectedDisciplina || !selectedProfessor) return;
        if (!window.confirm('Atribuir este professor a todas as turmas livres desta disciplina?')) return;

        setBulkAssigning(true);
        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        try {
            for (const turma of filteredTurmas) {
                try {
                    const disciplinas = await academicService.getTurmaDisciplinas(turma.id);
                    const disciplina = disciplinas.find((d: any) => d.id === parseInt(selectedDisciplina));
                    if (!disciplina) {
                        continue;
                    }
                    if (disciplina.professor_id) {
                        skippedCount++;
                        continue;
                    }

                    await academicService.atribuirProfessor(turma.id, {
                        disciplina_id: disciplina.id,
                        professor_id: parseInt(selectedProfessor)
                    });
                    successCount++;
                } catch (err) {
                    errorCount++;
                }
            }

            setSuccess(`Atribuições concluídas: ${successCount} sucesso(s), ${skippedCount} já ocupada(s), ${errorCount} erro(s).`);
            fetchAssignments(selectedProfessor);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atribuir em massa.');
        } finally {
            setBulkAssigning(false);
        }
    };

    const handleRemoveAssignment = async (assignment: any) => {
        if (!window.confirm(`Remover atribuição de ${assignment.disciplina_nome}?`)) return;

        try {
            await academicService.atribuirProfessor(assignment.turma_id, {
                disciplina_id: assignment.disciplina_id,
                professor_id: null
            });
            setSuccess('Atribuição removida.');
            fetchAssignments(selectedProfessor);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao remover atribuição.');
        }
    };

    const filteredTurmas = selectedClasse
        ? turmas.filter(t => t.classe.id === parseInt(selectedClasse))
        : turmas;

    return (
        <Container fluid className="py-2">
            <h2 className="mb-4 fw-bold">Atribuição por Professor</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Row>
                <Col md={12} className="mb-4">
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <Form.Group>
                                <Form.Label className="fw-bold">Selecione o Professor</Form.Label>
                                <Form.Select
                                    value={selectedProfessor}
                                    onChange={e => setSelectedProfessor(e.target.value)}
                                    size="lg"
                                    disabled={loading}
                                >
                                    <option value="">-- Selecione --</option>
                                    {professores.map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {selectedProfessor && (
                <Row>
                    <Col md={7}>
                        <Card className="shadow-sm border-0 mb-3">
                            <Card.Header className="bg-white py-3">
                                <h5 className="mb-0 fw-bold">Atribuições Atuais</h5>
                            </Card.Header>
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Turma</th>
                                        <th>Disciplina</th>
                                        <th className="text-end">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignments.length === 0 ? (
                                        <tr><td colSpan={3} className="text-center py-4 text-muted">Nenhuma atribuição encontrada.</td></tr>
                                    ) : (
                                        assignments.map(a => (
                                            <tr key={a.id}>
                                                <td><Badge bg="info" className="text-dark">{a.turma_nome}</Badge></td>
                                                <td className="fw-bold">{a.disciplina_nome}</td>
                                                <td className="text-end">
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveAssignment(a)}>
                                                        Remover
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card>
                    </Col>

                    <Col md={5}>
                        <Card className="shadow-sm border-0 bg-light">
                            <Card.Header className="bg-transparent py-3">
                                <h5 className="mb-0 fw-bold">Nova Atribuição</h5>
                            </Card.Header>
                            <Card.Body>
                                <Form.Group className="mb-3">
                                    <Form.Label>Filtrar Classe (Opcional)</Form.Label>
                                    <Form.Select value={selectedClasse} onChange={e => {
                                        setSelectedClasse(e.target.value);
                                        setSelectedTurma('');
                                    }}>
                                        <option value="">Todas</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Turma *</Form.Label>
                                    <Form.Select value={selectedTurma} onChange={e => setSelectedTurma(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {filteredTurmas.map(t => <option key={t.id} value={t.id}>{t.nome} - {t.ano_letivo}</option>)}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Disciplina *</Form.Label>
                                    <Form.Select
                                        value={selectedDisciplina}
                                        onChange={e => setSelectedDisciplina(e.target.value)}
                                        disabled={!selectedTurma}
                                    >
                                        <option value="">Selecione...</option>
                                        {turmaDisciplinas.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.nome} {d.professor_id ? '(Ocupada)' : ''}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    {turmaDisciplinas.find(d => d.id === parseInt(selectedDisciplina))?.professor_id && (
                                        <Form.Text className="text-warning">
                                            Atenção: Esta disciplina já tem professor. Será substituído.
                                        </Form.Text>
                                    )}
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    className="w-100"
                                    onClick={handleAddAssignment}
                                    disabled={!selectedTurma || !selectedDisciplina}
                                >
                                    Atribuir
                                </Button>
                                <Button
                                    variant="outline-primary"
                                    className="w-100 mt-2"
                                    onClick={handleAssignAllFreeTurmas}
                                    disabled={!selectedDisciplina || !selectedProfessor || bulkAssigning}
                                >
                                    {bulkAssigning ? 'A atribuir...' : 'Atribuir em todas as turmas livres'}
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default AtribuicaoProfessor;
