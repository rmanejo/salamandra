import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaSave, FaCheckCircle } from 'react-icons/fa';
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

const Avaliacoes: React.FC = () => {
    const [alunoId, setAlunoId] = useState('');
    const [turmaId, setTurmaId] = useState('');
    const [disciplinaId, setDisciplinaId] = useState('');
    const [trimestre, setTrimestre] = useState('1');
    const [tipo, setTipo] = useState('ACS');
    const [valor, setValor] = useState('');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await evaluationService.postGrade({
                aluno: parseInt(alunoId),
                turma: parseInt(turmaId),
                disciplina: parseInt(disciplinaId),
                trimestre: parseInt(trimestre),
                tipo,
                valor: parseFloat(valor)
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            // Clear form
            setValor('');
            setAlunoId('');
            setDisciplinaId('');
        } catch (err: any) {
            console.error('Grade submission error:', err);
            setError(err.response?.data?.message || 'Erro ao lançar nota');
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
                <h2 className="fw-bold">Lançamento de Notas</h2>
                <p className="text-secondary">Registe as avaliações dos alunos por disciplina e trimestre</p>
            </div>

            <Row>
                <Col lg={8}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {success && (
                                <Alert variant="success" className="d-flex align-items-center gap-2" dismissible onClose={() => setSuccess(false)}>
                                    <FaCheckCircle /> Nota lançada com sucesso!
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
                                                    setAlunoId(''); // Reset aluno when turma changes
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
                                        <Form.Group controlId="aluno">
                                            <Form.Label className="fw-bold">Aluno</Form.Label>
                                            <Form.Select
                                                value={alunoId}
                                                onChange={(e) => setAlunoId(e.target.value)}
                                                required
                                                disabled={!turmaId}
                                            >
                                                <option value="">{turmaId ? 'Selecionar Aluno...' : 'Selecione primeiro a turma'}</option>
                                                {alunos.map((aluno) => (
                                                    <option key={aluno.id} value={aluno.id}>
                                                        {aluno.nome_completo}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row className="g-3 mb-4">
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
                                    <Col md={6}>
                                        <Form.Group controlId="trimestre">
                                            <Form.Label className="fw-bold">Trimestre</Form.Label>
                                            <Form.Select
                                                value={trimestre}
                                                onChange={(e) => setTrimestre(e.target.value)}
                                                required
                                            >
                                                <option value="1">1º Trimestre</option>
                                                <option value="2">2º Trimestre</option>
                                                <option value="3">3º Trimestre</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row className="g-3 mb-4">
                                    <Col md={6}>
                                        <Form.Group controlId="tipo">
                                            <Form.Label className="fw-bold">Tipo de Avaliação</Form.Label>
                                            <Form.Select
                                                value={tipo}
                                                onChange={(e) => setTipo(e.target.value)}
                                                required
                                            >
                                                <option value="ACS">ACS (Contínua)</option>
                                                <option value="MAP">MAP (Prática)</option>
                                                <option value="ACP">ACP (Parcial/Final)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group controlId="valor">
                                            <Form.Label className="fw-bold">Nota (0-20)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="20"
                                                placeholder="Ex: 14.5"
                                                value={valor}
                                                onChange={(e) => setValor(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <div className="text-end border-top pt-4">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        className="px-5 d-flex align-items-center gap-2 ms-auto"
                                        disabled={loading}
                                    >
                                        <FaSave /> {loading ? 'Salvando...' : 'Salvar Nota'}
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
                                As notas lançadas serão refletidas automaticamente na pauta trimestral da turma.
                            </p>
                            <hr className="bg-white-50 my-3" />
                            <p className="small text-white-50 mb-0">
                                <strong>Tipos de Avaliação:</strong><br />
                                • ACS: Avaliação Contínua Sistemática<br />
                                • MAP: Média de Avaliação Prática<br />
                                • ACP: Avaliação Classificativa Parcial
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Avaliacoes;
