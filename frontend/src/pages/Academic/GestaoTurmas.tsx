import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Badge, Modal, Spinner, Alert } from 'react-bootstrap';
import { FaUsers, FaSync, FaTools, FaCheckCircle } from 'react-icons/fa';
import { academicService } from '../../services/api';

interface Classe {
    id: number;
    nome: string;
}

interface Turma {
    id: number;
    nome: string;
    classe: Classe;
    ano_letivo: number;
    student_count?: number; // Backend might provide this or we calculate
}

const GestaoTurmas: React.FC = () => {
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [classes, setClasses] = useState<Classe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);

    // Formar Turmas Modal
    const [showFormarModal, setShowFormarModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formarData, setFormarData] = useState({
        classe_id: '',
        ano_letivo: new Date().getFullYear(),
        min_alunos: 20,
        max_alunos: 50
    });

    const [formationResult, setFormationResult] = useState<any>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [classesData, turmasData] = await Promise.all([
                academicService.getClasses(),
                academicService.getTurmas()
            ]);
            setClasses(classesData);
            setTurmas(turmasData);
        } catch (err: any) {
            setError('Erro ao carregar dados de turmas e classes');
        } finally {
            setLoading(false);
        }
    };

    const handleFormarTurmas = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setFormationResult(null);
        try {
            const data = {
                ...formarData,
                classe_id: parseInt(formarData.classe_id)
            };
            const result = await academicService.formarTurmas(data);
            setFormationResult(result);
            setSuccess('Processo de formação de turmas concluído!');
            // Refresh turmas list
            const updatedTurmas = await academicService.getTurmas();
            setTurmas(updatedTurmas);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao formar turmas');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInitialSetup = async () => {
        setSetupLoading(true);
        setError('');
        setSuccess('');
        try {
            await academicService.setupAcademico();
            setSuccess('Estrutura académica inicial configurada com sucesso!');
            await fetchInitialData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao configurar estrutura académica');
        } finally {
            setSetupLoading(false);
        }
    };

    if (loading) return (
        <div className="p-5 text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Carregando gestão de turmas...</p>
        </div>
    );

    return (
        <Container fluid className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Gestão de Turmas</h2>
                    <p className="text-secondary mb-0">Organização de turmas e distribuição de alunos</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={fetchInitialData}>
                        <FaSync /> Atualizar
                    </Button>
                    <Button variant="primary" onClick={() => setShowFormarModal(true)}>
                        <FaTools className="me-2" /> Formação Automática
                    </Button>
                </div>
            </div>

            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            {classes.length === 0 && !loading && (
                <Card className="border-primary bg-light mb-4 shadow-sm">
                    <Card.Body className="text-center py-5">
                        <FaTools className="text-primary display-4 mb-3" />
                        <h3 className="fw-bold">Configuração Inicial Necessária</h3>
                        <p className="text-secondary mx-auto" style={{ maxWidth: '600px' }}>
                            A sua escola ainda não possui classes ou disciplinas configuradas.
                            Clique no botão abaixo para gerar automaticamente a estrutura base de acordo com o tipo da sua escola.
                        </p>
                        <Button
                            variant="primary"
                            size="lg"
                            className="mt-3 px-5"
                            onClick={handleInitialSetup}
                            disabled={setupLoading}
                        >
                            {setupLoading ? (
                                <><Spinner size="sm" className="me-2" /> Configurando...</>
                            ) : 'Configurar Estrutura Académica'}
                        </Button>
                    </Card.Body>
                </Card>
            )}

            <Row className="g-4">
                <Col md={12}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white py-3">
                            <h5 className="mb-0 fw-bold">Turmas Existentes</h5>
                        </Card.Header>
                        <Table responsive hover className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Nome da Turma</th>
                                    <th>Classe</th>
                                    <th>Ano Letivo</th>
                                    <th>Alunos</th>
                                    <th className="text-end">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {turmas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4 text-muted">
                                            Nenhuma turma encontrada. Utilize a "Formação Automática" para criar turmas.
                                        </td>
                                    </tr>
                                ) : (
                                    turmas.map(turma => (
                                        <tr key={turma.id}>
                                            <td className="fw-bold">{turma.nome}</td>
                                            <td>{turma.classe?.nome}</td>
                                            <td>{turma.ano_letivo}</td>
                                            <td>
                                                <Badge bg="light" text="dark" className="border">
                                                    <FaUsers className="me-1 text-primary" /> {turma.student_count || 0}
                                                </Badge>
                                            </td>
                                            <td className="text-end">
                                                <Button variant="link" size="sm" className="text-primary">Ver Lista</Button>
                                                <Button variant="link" size="sm" className="text-muted">Editar</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>

            {/* Modal: Formação Automática */}
            <Modal show={showFormarModal} onHide={() => setShowFormarModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Formação Automática de Turmas</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleFormarTurmas}>
                    <Modal.Body>
                        {!formationResult ? (
                            <>
                                <p className="text-muted mb-4">
                                    Este assistente distribuirá automaticamente os alunos matriculados que ainda não possuem turma,
                                    criando novas turmas baseadas nos limites definidos.
                                </p>
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Classe *</Form.Label>
                                            <Form.Select
                                                required
                                                value={formarData.classe_id}
                                                onChange={e => setFormarData({ ...formarData, classe_id: e.target.value })}
                                            >
                                                <option value="">Selecionar...</option>
                                                {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Ano Letivo *</Form.Label>
                                            <Form.Control
                                                type="number"
                                                required
                                                value={formarData.ano_letivo}
                                                onChange={e => setFormarData({ ...formarData, ano_letivo: parseInt(e.target.value) })}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Mínimo de Alunos por Turma</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={formarData.min_alunos}
                                                onChange={e => setFormarData({ ...formarData, min_alunos: parseInt(e.target.value) })}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Máximo de Alunos por Turma</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={formarData.max_alunos}
                                                onChange={e => setFormarData({ ...formarData, max_alunos: parseInt(e.target.value) })}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </>
                        ) : (
                            <div className="text-center py-3">
                                <div className="mb-4">
                                    <FaCheckCircle className="text-success display-4" />
                                    <h4 className="mt-3">Sucesso!</h4>
                                </div>
                                <div className="bg-light p-4 rounded mb-3 text-start">
                                    <p className="mb-1"><strong>Status:</strong> {formationResult.status}</p>
                                    <p className="mb-1"><strong>Mensagem:</strong> {formationResult.message}</p>
                                    {formationResult.turmas_criadas && (
                                        <p className="mb-0"><strong>Turmas Criadas:</strong> {formationResult.turmas_criadas.length}</p>
                                    )}
                                </div>
                                <Button variant="outline-primary" onClick={() => setFormationResult(null)}>
                                    Formar mais turmas
                                </Button>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        {!formationResult && (
                            <>
                                <Button variant="secondary" onClick={() => setShowFormarModal(false)}>Cancelar</Button>
                                <Button variant="primary" type="submit" disabled={submitting}>
                                    {submitting ? (
                                        <><Spinner size="sm" className="me-2" /> Processando...</>
                                    ) : 'Iniciar Formação'}
                                </Button>
                            </>
                        )}
                        {formationResult && (
                            <Button variant="primary" onClick={() => setShowFormarModal(false)}>Concluir</Button>
                        )}
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default GestaoTurmas;
