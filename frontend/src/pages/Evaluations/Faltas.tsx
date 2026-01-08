import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import { FaSave, FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import { evaluationService, academicService } from '../../services/api';

interface Turma {
    id: number;
    nome: string;
    classe?: any;
}

interface Disciplina {
    id: number;
    nome: string;
}

interface Aluno {
    id: number;
    nome_completo: string;
}

const Faltas: React.FC = () => {
    const [turmaId, setTurmaId] = useState('');
    const [disciplinaId, setDisciplinaId] = useState('');
    const [data, setData] = useState('');
    const [tipo, setTipo] = useState('INJUSTIFICADA');
    const [alunosSelecionados, setAlunosSelecionados] = useState<number[]>([]);
    
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [loadingData, setLoadingData] = useState(true);

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

    useEffect(() => {
        const fetchAlunos = async () => {
            if (turmaId) {
                try {
                    const alunosData = await academicService.getStudents({ turma_id: turmaId });
                    setAlunos(Array.isArray(alunosData) ? alunosData : []);
                } catch (err: any) {
                    console.error('Error fetching alunos:', err);
                }
            } else {
                setAlunos([]);
            }
        };
        fetchAlunos();
    }, [turmaId]);

    const handleToggleAluno = (alunoId: number) => {
        setAlunosSelecionados(prev => 
            prev.includes(alunoId) 
                ? prev.filter(id => id !== alunoId)
                : [...prev, alunoId]
        );
    };

    const handleSelectAll = () => {
        if (alunosSelecionados.length === alunos.length) {
            setAlunosSelecionados([]);
        } else {
            setAlunosSelecionados(alunos.map(a => a.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!turmaId || !disciplinaId || !data || alunosSelecionados.length === 0) {
            setError('Por favor, preencha todos os campos e selecione pelo menos um aluno');
            setLoading(false);
            return;
        }

        try {
            // Lançar faltas para todos os alunos selecionados
            const promises = alunosSelecionados.map(alunoId =>
                evaluationService.postAbsence({
                    aluno: alunoId,
                    turma: parseInt(turmaId),
                    disciplina: parseInt(disciplinaId),
                    data,
                    tipo
                })
            );

            await Promise.all(promises);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            // Clear form
            setAlunosSelecionados([]);
            setData('');
        } catch (err: any) {
            console.error('Absence submission error:', err);
            setError(err.response?.data?.error || 'Erro ao lançar faltas');
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
            <div className="mb-4">
                <h2 className="fw-bold">Lançamento de Faltas</h2>
                <p className="text-secondary">Registe as faltas dos alunos por disciplina e data</p>
            </div>

            <Row>
                <Col lg={8}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {success && (
                                <Alert variant="success" className="d-flex align-items-center gap-2" dismissible onClose={() => setSuccess(false)}>
                                    <FaCheckCircle /> Faltas lançadas com sucesso!
                                </Alert>
                            )}

                            {error && (
                                <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                <Row className="g-3 mb-4">
                                    <Col md={6}>
                                        <Form.Group controlId="turma">
                                            <Form.Label className="fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={turmaId}
                                                onChange={(e) => {
                                                    setTurmaId(e.target.value);
                                                    setAlunosSelecionados([]);
                                                }}
                                                required
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
                                    <Col md={6}>
                                        <Form.Group controlId="disciplina">
                                            <Form.Label className="fw-bold">Disciplina</Form.Label>
                                            <Form.Select
                                                value={disciplinaId}
                                                onChange={(e) => setDisciplinaId(e.target.value)}
                                                required
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
                                </Row>

                                <Row className="g-3 mb-4">
                                    <Col md={6}>
                                        <Form.Group controlId="data">
                                            <Form.Label className="fw-bold">Data</Form.Label>
                                            <Form.Control
                                                type="date"
                                                value={data}
                                                onChange={(e) => setData(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group controlId="tipo">
                                            <Form.Label className="fw-bold">Tipo de Falta</Form.Label>
                                            <Form.Select
                                                value={tipo}
                                                onChange={(e) => setTipo(e.target.value)}
                                                required
                                            >
                                                <option value="INJUSTIFICADA">Injustificada</option>
                                                <option value="JUSTIFICADA">Justificada</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {turmaId && alunos.length > 0 && (
                                    <Card className="mb-4 border">
                                        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                            <span className="fw-bold">Selecionar Alunos</span>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={handleSelectAll}
                                                className="p-0 text-decoration-none"
                                            >
                                                {alunosSelecionados.length === alunos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                            </Button>
                                        </Card.Header>
                                        <Card.Body className="p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            <Table hover className="mb-0">
                                                <tbody>
                                                    {alunos.map((aluno) => (
                                                        <tr key={aluno.id}>
                                                            <td>
                                                                <Form.Check
                                                                    type="checkbox"
                                                                    checked={alunosSelecionados.includes(aluno.id)}
                                                                    onChange={() => handleToggleAluno(aluno.id)}
                                                                    label={aluno.nome_completo}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                )}

                                <div className="text-end border-top pt-4">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        className="px-5 d-flex align-items-center gap-2 ms-auto"
                                        disabled={loading || alunosSelecionados.length === 0}
                                    >
                                        <FaSave /> {loading ? 'Salvando...' : `Salvar Faltas (${alunosSelecionados.length})`}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="border-0 shadow-sm bg-navy text-white h-100">
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-4">Informação</h5>
                            <p className="small text-white-50 mb-0">
                                Selecione a turma, disciplina e data. Em seguida, marque os alunos que faltaram.
                            </p>
                            <hr className="bg-white-50 my-3" />
                            <p className="small text-white-50 mb-0">
                                <strong>Tipos de Falta:</strong><br />
                                • <strong>Injustificada:</strong> Falta sem justificativa<br />
                                • <strong>Justificada:</strong> Falta com justificativa válida
                            </p>
                            <hr className="bg-white-50 my-3" />
                            <p className="small text-white-50 mb-0">
                                Você pode selecionar múltiplos alunos de uma vez para agilizar o lançamento.
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Faltas;

