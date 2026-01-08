import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { FaSearch, FaUserPlus, FaFilter, FaSync, FaEdit, FaExchangeAlt } from 'react-icons/fa';
import { academicService } from '../../services/api';

interface Student {
    id: number;
    nome_completo: string;
    sexo: string;
    data_nascimento: string;
    classe_atual?: any;
    turma_atual?: any;
}

interface Turma {
    id: number;
    nome: string;
    classe?: any;
}

interface Classe {
    id: number;
    nome: string;
}

const Alunos: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [classeFilter, setClasseFilter] = useState('');
    const [turmaFilter, setTurmaFilter] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [classes, setClasses] = useState<Classe[]>([]);
    
    // Form states
    const [formData, setFormData] = useState({
        nome_completo: '',
        sexo: 'HOMEM',
        data_nascimento: '',
        classe_atual: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [moveTurmaId, setMoveTurmaId] = useState('');

    const fetchStudents = async () => {
        setLoading(true);
        setError('');
        try {
            const params: any = {};
            if (classeFilter) params.classe_id = classeFilter;
            if (turmaFilter) params.turma_id = turmaFilter;

            const response = await academicService.getStudents(params);
            setStudents(response);
        } catch (err: any) {
            console.error('Students fetch error:', err);
            setError('Erro ao carregar alunos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [classeFilter, turmaFilter]);

    useEffect(() => {
        const fetchTurmasAndClasses = async () => {
            try {
                const turmasData = await academicService.getTurmas();
                setTurmas(Array.isArray(turmasData) ? turmasData : []);
                
                // Extract unique classes from turmas
                const uniqueClasses = Array.from(
                    new Map(
                        turmasData
                            .filter((t: Turma) => t.classe)
                            .map((t: Turma) => [t.classe.id, t.classe])
                    ).values()
                );
                setClasses(uniqueClasses);
            } catch (err: any) {
                console.error('Error fetching turmas:', err);
            }
        };
        fetchTurmasAndClasses();
    }, []);

    const handleOpenModal = () => {
        setFormData({
            nome_completo: '',
            sexo: 'HOMEM',
            data_nascimento: '',
            classe_atual: ''
        });
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormData({
            nome_completo: '',
            sexo: 'HOMEM',
            data_nascimento: '',
            classe_atual: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await academicService.enrollStudent({
                ...formData,
                classe_atual: parseInt(formData.classe_atual)
            });
            setSuccess('Aluno inscrito com sucesso!');
            await fetchStudents();
            setTimeout(() => {
                handleCloseModal();
            }, 1500);
        } catch (err: any) {
            console.error('Enroll error:', err);
            setError(err.response?.data?.error || 'Erro ao inscrever aluno');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenMoveModal = (student: Student) => {
        setSelectedStudent(student);
        setMoveTurmaId('');
        setError('');
        setSuccess('');
        setShowMoveModal(true);
    };

    const handleMoveStudent = async () => {
        if (!selectedStudent || !moveTurmaId) {
            setError('Por favor, selecione uma turma');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            await academicService.moveStudent(selectedStudent.id, parseInt(moveTurmaId));
            setSuccess('Aluno movido com sucesso!');
            await fetchStudents();
            setTimeout(() => {
                setShowMoveModal(false);
                setSelectedStudent(null);
            }, 1500);
        } catch (err: any) {
            console.error('Move error:', err);
            setError(err.response?.data?.error || 'Erro ao mover aluno');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Gestão de Alunos</h2>
                    <p className="text-secondary">Cadastre e gerencie os alunos da instituição</p>
                </div>
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-primary"
                        className="d-flex align-items-center gap-2"
                        onClick={fetchStudents}
                        disabled={loading}
                    >
                        <FaSync /> Atualizar
                    </Button>
                    <Button variant="primary" className="d-flex align-items-center gap-2" onClick={handleOpenModal}>
                        <FaUserPlus /> Novo Aluno
                    </Button>
                </div>
            </div>

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6} lg={4}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white border-end-0">
                                    <FaSearch className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Filtrar por nome..."
                                    className="border-start-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3} lg={2}>
                            <Form.Select
                                value={classeFilter}
                                onChange={(e) => {
                                    setClasseFilter(e.target.value);
                                    setTurmaFilter(''); // Reset turma when classe changes
                                }}
                            >
                                <option value="">Todas as Classes</option>
                                {classes.map((classe) => (
                                    <option key={classe.id} value={classe.id}>
                                        {classe.nome}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col md={3} lg={2}>
                            <Form.Select
                                value={turmaFilter}
                                onChange={(e) => setTurmaFilter(e.target.value)}
                                disabled={!classeFilter}
                            >
                                <option value="">Todas as Turmas</option>
                                {turmas
                                    .filter(t => !classeFilter || t.classe?.id === parseInt(classeFilter))
                                    .map((turma) => (
                                        <option key={turma.id} value={turma.id}>
                                            {turma.nome}
                                        </option>
                                    ))}
                            </Form.Select>
                        </Col>
                        <Col md={12} lg={4} className="text-lg-end">
                            <Button
                                variant="light"
                                className="d-flex align-items-center gap-2 ms-auto"
                                onClick={() => {
                                    setSearchTerm('');
                                    setClasseFilter('');
                                    setTurmaFilter('');
                                }}
                            >
                                <FaFilter /> Limpar Filtros
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : (
                        <Table responsive hover className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">ID</th>
                                    <th>Nome Completo</th>
                                    <th>Sexo</th>
                                    <th>Data Nasc.</th>
                                    <th>Classe/Turma</th>
                                    <th className="text-end pe-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-4 text-muted">
                                            Nenhum aluno encontrado
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <tr key={student.id}>
                                            <td className="ps-4">{student.id}</td>
                                            <td className="fw-bold">{student.nome_completo}</td>
                                            <td>{student.sexo}</td>
                                            <td>{student.data_nascimento}</td>
                                            <td>{student.classe_atual?.nome || '-'} {student.turma_atual?.nome || ''}</td>
                                            <td className="text-end pe-4">
                                                <Button 
                                                    variant="link" 
                                                    className="text-primary p-0 me-3 text-decoration-none"
                                                    onClick={() => handleOpenMoveModal(student)}
                                                >
                                                    <FaExchangeAlt /> Mover
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
                <Card.Footer className="bg-white py-3 border-0 text-end">
                    <div className="text-muted small">Mostrando {filteredStudents.length} alunos cadastrados</div>
                </Card.Footer>
            </Card>

            {/* Modal de Inscrição */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Inscrever Novo Aluno</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {success && <Alert variant="success">{success}</Alert>}
                        {error && <Alert variant="danger">{error}</Alert>}
                        
                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group controlId="nome_completo">
                                    <Form.Label className="fw-bold">Nome Completo *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.nome_completo}
                                        onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group controlId="sexo">
                                    <Form.Label className="fw-bold">Sexo *</Form.Label>
                                    <Form.Select
                                        value={formData.sexo}
                                        onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                        required
                                    >
                                        <option value="HOMEM">Masculino</option>
                                        <option value="MULHER">Feminino</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group controlId="data_nascimento">
                                    <Form.Label className="fw-bold">Data de Nascimento *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={formData.data_nascimento}
                                        onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group controlId="classe_atual">
                                    <Form.Label className="fw-bold">Classe *</Form.Label>
                                    <Form.Select
                                        value={formData.classe_atual}
                                        onChange={(e) => setFormData({ ...formData, classe_atual: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecionar Classe...</option>
                                        {classes.map((classe) => (
                                            <option key={classe.id} value={classe.id}>
                                                {classe.nome}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Salvando...' : 'Inscrever Aluno'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal de Mover Aluno */}
            <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Mover Aluno de Turma</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {success && <Alert variant="success">{success}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    {selectedStudent && (
                        <>
                            <p className="mb-3">
                                <strong>Aluno:</strong> {selectedStudent.nome_completo}<br />
                                <strong>Turma Atual:</strong> {selectedStudent.turma_atual?.nome || 'Sem turma'}
                            </p>
                            
                            <Form.Group controlId="nova_turma">
                                <Form.Label className="fw-bold">Nova Turma *</Form.Label>
                                <Form.Select
                                    value={moveTurmaId}
                                    onChange={(e) => setMoveTurmaId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecionar Turma...</option>
                                    {turmas
                                        .filter(t => t.classe?.id === selectedStudent.classe_atual?.id)
                                        .map((turma) => (
                                            <option key={turma.id} value={turma.id}>
                                                {turma.nome} {turma.classe?.nome ? `(${turma.classe.nome})` : ''}
                                            </option>
                                        ))}
                                </Form.Select>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMoveModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleMoveStudent} disabled={submitting || !moveTurmaId}>
                        {submitting ? 'Movendo...' : 'Mover Aluno'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default Alunos;
