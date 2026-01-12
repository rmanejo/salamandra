
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Modal, Alert, Row, Col, Badge, Spinner, Tab, Tabs } from 'react-bootstrap';
import { academicService } from '../../services/api';
import { FaEdit, FaUserTie, FaArrowLeft, FaEye, FaTrash } from 'react-icons/fa';

const GestaoTurmasDAE: React.FC = () => {
    const [turmas, setTurmas] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [professores, setProfessores] = useState<any[]>([]);

    // Filters
    const [filterClasse, setFilterClasse] = useState('');
    const [filterAno, setFilterAno] = useState(new Date().getFullYear().toString());

    // UI Mode
    const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
    const [activeTab, setActiveTab] = useState('alunos');
    const [selectedTurma, setSelectedTurma] = useState<any>(null);

    // Details Data
    const [turmaAlunos, setTurmaAlunos] = useState<any[]>([]);
    const [turmaDisciplinas, setTurmaDisciplinas] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Assignment State (inside details)

    const [assignProfessor, setAssignProfessor] = useState('');

    // Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTurma, setEditingTurma] = useState<any>(null);
    const [editName, setEditName] = useState('');

    // DT Assignment Modal
    const [showDTModal, setShowDTModal] = useState(false);
    const [selectedTurmaDT, setSelectedTurmaDT] = useState<any>(null);
    const [selectedProfDT, setSelectedProfDT] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

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
        } catch (err) {
            setError('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetails = async (turma: any) => {
        setSelectedTurma(turma);
        setViewMode('details');
        setLoadingDetails(true);
        try {
            const [alunos, disciplinas] = await Promise.all([
                academicService.getStudents({ turma_id: turma.id }),
                academicService.getTurmaDisciplinas(turma.id)
            ]);
            setTurmaAlunos(alunos);
            setTurmaDisciplinas(disciplinas);
        } catch (err) {
            setError('Erro ao carregar detalhes da turma.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleBackToList = () => {
        setViewMode('list');
        setSelectedTurma(null);
        setTurmaAlunos([]);
        setTurmaDisciplinas([]);
    };

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedDisciplineAssign, setSelectedDisciplineAssign] = useState<any>(null);

    const handleOpenAssignModal = (disciplina: any) => {
        setSelectedDisciplineAssign(disciplina);
        setAssignProfessor('');
        setShowAssignModal(true);
    };

    const handleSaveAssignment = async () => {
        if (!selectedTurma || !selectedDisciplineAssign || !assignProfessor) return;
        try {
            await academicService.atribuirProfessor(selectedTurma.id, {
                disciplina_id: selectedDisciplineAssign.id,
                professor_id: parseInt(assignProfessor)
            });
            setSuccess(`Professor atribuído à disciplina ${selectedDisciplineAssign.nome}.`);
            // Refresh disciplines
            const updatedDisciplinas = await academicService.getTurmaDisciplinas(selectedTurma.id);
            setTurmaDisciplinas(updatedDisciplinas);
            setShowAssignModal(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atribuir professor.');
        }
    };

    const handleRemoveAssignment = async (disciplina: any) => {
        if (!window.confirm(`Remover professor de ${disciplina.nome}?`)) return;
        try {
            await academicService.atribuirProfessor(selectedTurma.id, {
                disciplina_id: disciplina.id,
                professor_id: null
            });
            setSuccess('Atribuição removida.');
            const updatedDisciplinas = await academicService.getTurmaDisciplinas(selectedTurma.id);
            setTurmaDisciplinas(updatedDisciplinas);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao remover atribuição.');
        }
    };

    const handleEditClick = (turma: any) => {
        setEditingTurma(turma);
        setEditName(turma.nome);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTurma) return;
        try {
            // Assuming partial update is allowed on /academico/turmas/:id/
            // Need a patch method in api.ts? or generic put?
            // Assuming academicService has updateTurma or similar. If not, creating it.
            // Wait, api.ts usually doesn't have updateTurma. I might need to add it.
            await academicService.updateTurma(editingTurma.id, { nome: editName });

            setSuccess('Turma atualizada com sucesso!');
            setShowEditModal(false);
            fetchInitialData(); // Refresh
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar turma.');
        }
    };

    const handleDTClick = (turma: any) => {
        setSelectedTurmaDT(turma);
        setSelectedProfDT(''); // Clear previous selection
        setShowDTModal(true);
    };

    const handleSaveDT = async () => {
        if (!selectedTurmaDT || !selectedProfDT) return;
        try {
            // Use DAEService logic via API
            // Endpoint: /academico/dae/atribuir_cargo/
            // Payload: professor_id, cargo_tipo='DT', entidade_id=turma.id, ano_letivo
            await academicService.atribuirCargo({
                professor_id: parseInt(selectedProfDT),
                cargo_tipo: 'DT',
                entidade_id: selectedTurmaDT.id,
                ano_letivo: selectedTurmaDT.ano_letivo
            });

            setSuccess(`Director atribuído à turma ${selectedTurmaDT.nome}.`);
            setShowDTModal(false);
            fetchInitialData();
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao atribuir Director.');
        }
    };

    const handleRemoveDT = async (turma: any) => {
        if (!window.confirm(`Remover Director de Turma da turma ${turma.nome}?`)) return;
        try {
            await academicService.atribuirCargo({
                professor_id: null,
                cargo_tipo: 'DT',
                entidade_id: turma.id,
                ano_letivo: turma.ano_letivo
            });
            setSuccess(`Director removido da turma ${turma.nome}.`);
            fetchInitialData();
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao remover Director.');
        }
    };

    const filteredTurmas = turmas.filter(t => {
        // Filter by Class and Year
        const matchClasse = filterClasse ? t.classe.id === parseInt(filterClasse) : true;
        const matchAno = filterAno ? t.ano_letivo.toString() === filterAno : true;
        return matchClasse && matchAno;
    });



    if (viewMode === 'details' && selectedTurma) {
        return (
            <Container fluid className="py-2">
                <Button variant="outline-secondary" className="mb-3" onClick={handleBackToList}>
                    <FaArrowLeft /> Voltar
                </Button>

                <h3 className="mb-4 fw-bold text-primary">
                    {selectedTurma.nome} <Badge bg="secondary" className="fs-6">{selectedTurma.classe.nome}</Badge>
                </h3>

                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'alunos')} className="mb-3">
                    <Tab eventKey="alunos" title={`Alunos (${turmaAlunos.length})`}>
                        <Card className="shadow-sm border-0">
                            <Table responsive hover className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Nome Completo</th>
                                        <th>Sexo</th>
                                        <th>Enc. Educação</th>
                                        <th>Contacto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingDetails ? (
                                        <tr><td colSpan={4} className="text-center py-4"><Spinner size="sm" /> Carregando...</td></tr>
                                    ) : turmaAlunos.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-4 text-muted">Nenhum aluno nesta turma.</td></tr>
                                    ) : (
                                        turmaAlunos.map(a => (
                                            <tr key={a.id}>
                                                <td>{a.nome_completo}</td>
                                                <td>{a.sexo === 'HOMEM' ? 'Homem' : a.sexo === 'MULHER' ? 'Mulher' : a.sexo || '-'}</td>
                                                <td>{a.encarregado_educacao || '-'}</td>
                                                <td>{a.contacto_encarregado || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card>
                    </Tab>
                    <Tab eventKey="docentes" title="Corpo Docente & Atribuições">
                        <Row>
                            <Col md={12}>
                                <Card className="shadow-sm border-0 mb-3">
                                    <Table responsive hover className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Disciplina</th>
                                                <th>Professor</th>
                                                <th className="text-end">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingDetails ? (
                                                <tr><td colSpan={3} className="text-center py-4"><Spinner size="sm" /></td></tr>
                                            ) : turmaDisciplinas.map(d => (
                                                <tr key={d.id}>
                                                    <td className="fw-bold">{d.nome}</td>
                                                    <td>
                                                        {d.professor_id ? (
                                                            <Badge bg="success">{d.professor_nome}</Badge>
                                                        ) : (
                                                            <span className="text-danger small">Não atribuído</span>
                                                        )}
                                                    </td>
                                                    <td className="text-end">
                                                        {d.professor_id ? (
                                                            <Button variant="outline-danger" size="sm" onClick={() => handleRemoveAssignment(d)}>
                                                                <FaTrash /> Remover
                                                            </Button>
                                                        ) : (
                                                            <Button variant="outline-primary" size="sm" onClick={() => handleOpenAssignModal(d)}>
                                                                <FaUserTie /> Atribuir
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card>
                            </Col>
                        </Row>

                        {/* Assignment Modal */}
                        <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                            <Modal.Header closeButton>
                                <Modal.Title>Atribuir Professor</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {selectedDisciplineAssign && <p>Disciplina: <strong>{selectedDisciplineAssign.nome}</strong></p>}
                                <Form.Group>
                                    <Form.Label>Professor</Form.Label>
                                    <Form.Select value={assignProfessor} onChange={e => setAssignProfessor(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {professores.map(p => (
                                            <option key={p.id} value={p.id}>{p.full_name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancelar</Button>
                                <Button variant="primary" onClick={handleSaveAssignment}>Salvar</Button>
                            </Modal.Footer>
                        </Modal>
                    </Tab>
                </Tabs>
            </Container>
        );
    }

    return (
        <Container fluid className="py-2">
            <h2 className="mb-4 fw-bold">Gestão de Turmas (DAE)</h2>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <Card className="mb-4 shadow-sm border-0">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Filtrar por Classe</Form.Label>
                                <Form.Select value={filterClasse} onChange={e => setFilterClasse(e.target.value)}>
                                    <option value="">Todas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Ano Lectivo</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={filterAno}
                                    onChange={e => setFilterAno(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0">
                <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Turma</th>
                            <th>Classe</th>
                            <th>Ano</th>
                            <th>Director de Turma</th>
                            <th className="text-end">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-4"><Spinner size="sm" /> Carregando...</td></tr>
                        ) : filteredTurmas.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-muted">Nenhuma turma encontrada.</td></tr>
                        ) : (
                            filteredTurmas.map(t => (
                                <tr key={t.id}>
                                    <td className="fw-bold text-primary" style={{ cursor: 'pointer' }} onClick={() => handleOpenDetails(t)}>
                                        {t.nome}
                                    </td>
                                    <td>{t.classe.nome}</td>
                                    <td>{t.ano_letivo}</td>
                                    <td>
                                        {t.director_nome ? (
                                            <Badge bg="success" className="p-2"><FaUserTie className="me-1" />{t.director_nome}</Badge>
                                        ) : (
                                            <Badge bg="secondary" className="p-2">Não atribuído</Badge>
                                        )}
                                    </td>
                                    <td className="text-end">
                                        <Button variant="outline-info" size="sm" className="me-2" onClick={() => handleOpenDetails(t)}>
                                            <FaEye /> Detalhes
                                        </Button>
                                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEditClick(t)}>
                                            <FaEdit /> Editar
                                        </Button>
                                        {t.director_nome ? (
                                            <>
                                                <Button variant="outline-warning" size="sm" className="me-2" onClick={() => handleDTClick(t)}>
                                                    <FaUserTie /> Trocar DT
                                                </Button>
                                                <Button variant="outline-danger" size="sm" onClick={() => handleRemoveDT(t)}>
                                                    <FaTrash />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button variant="outline-dark" size="sm" onClick={() => handleDTClick(t)}>
                                                <FaUserTie /> Atribuir DT
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Modal Editar */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Editar Turma</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Nome da Turma</Form.Label>
                        <Form.Control
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveEdit}>Salvar</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Atribuir DT */}
            <Modal show={showDTModal} onHide={() => setShowDTModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Atribuir Director de Turma</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTurmaDT && <p>Turma: <strong>{selectedTurmaDT.nome}</strong></p>}
                    <Form.Group>
                        <Form.Label>Professor</Form.Label>
                        <Form.Select
                            value={selectedProfDT}
                            onChange={e => setSelectedProfDT(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {professores.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDTModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveDT}>Salvar</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default GestaoTurmasDAE;
