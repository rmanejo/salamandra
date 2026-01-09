import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Badge, Modal, Spinner, Alert } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaExchangeAlt, FaArrowRight, FaUserGraduate, FaSearch, FaTools } from 'react-icons/fa';
import { academicService, authService } from '../../services/api';

interface Aluno {
    id: number;
    nome_completo: string;
    data_nascimento: string;
    sexo: string;
    bairro: string;
    contacto_encarregado: string;
    pai?: string;
    mae?: string;
    classe_atual: any;
    turma_atual: any;
    classe_nome?: string;
    turma_nome?: string;
    ativo: boolean;
}

interface Classe {
    id: number;
    nome: string;
}

interface Turma {
    id: number;
    nome: string;
    classe: Classe;
    ano_letivo: number;
}

const GestaoAlunos: React.FC = () => {

    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [classes, setClasses] = useState<Classe[]>([]);
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [filterClasse, setFilterClasse] = useState('');
    const [filterTurma, setFilterTurma] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [pendingAction, setPendingAction] = useState<{ type: string; payload: any } | null>(null);
    const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
    const [academicStatus, setAcademicStatus] = useState<any>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);

    // Form states
    const [submitting, setSubmitting] = useState(false);
    const [studentForm, setStudentForm] = useState({
        nome_completo: '',
        data_nascimento: '',
        sexo: 'HOMEM',
        bairro: '',
        contacto_encarregado: '',
        pai: '',
        mae: '',
        classe_atual: '',
        turma_atual: ''
    });

    const [transferData, setTransferData] = useState({ escola_destino: '', motivo: '' });
    const [moveData, setMoveData] = useState({ nova_turma_id: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [classesData, turmasData] = await Promise.all([
                academicService.getClasses(),
                academicService.getTurmas()
            ]);
            setClasses(classesData);
            setTurmas(turmasData);
            await fetchAlunos();
        } catch (err: any) {
            setError('Erro ao carregar dados iniciais');
        } finally {
            setLoading(false);
        }
    };

    const fetchAlunos = async () => {
        try {
            const params: any = {};
            if (filterClasse) params.classe_id = filterClasse;
            if (filterTurma) params.turma_id = filterTurma;

            const data = await academicService.getStudents(params);
            setAlunos(data);
        } catch (err: any) {
            setError('Erro ao carregar alunos');
        }
    };

    useEffect(() => {
        fetchAlunos();
    }, [filterClasse, filterTurma]);

    const handleOpenEnroll = (aluno?: Aluno) => {
        if (aluno) {
            setSelectedAluno(aluno);
            setStudentForm({
                nome_completo: aluno.nome_completo,
                data_nascimento: aluno.data_nascimento,
                sexo: aluno.sexo,
                bairro: aluno.bairro,
                contacto_encarregado: aluno.contacto_encarregado,
                pai: aluno.pai || '',
                mae: aluno.mae || '',
                classe_atual: aluno.classe_atual?.id?.toString() || '',
                turma_atual: aluno.turma_atual?.id?.toString() || ''
            });
        } else {
            setSelectedAluno(null);
            setStudentForm({
                nome_completo: '',
                data_nascimento: '',
                sexo: 'HOMEM',
                bairro: '',
                contacto_encarregado: '',
                pai: '',
                mae: '',
                classe_atual: '',
                turma_atual: ''
            });
        }
        setShowEnrollModal(true);
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                ...studentForm,
                classe_atual: parseInt(studentForm.classe_atual),
                turma_atual: studentForm.turma_atual ? parseInt(studentForm.turma_atual) : null
            };

            if (selectedAluno) {
                await academicService.updateStudent(selectedAluno.id, payload);
                setSuccess('Aluno atualizado com sucesso!');
            } else {
                await academicService.enrollStudent(payload);
                setSuccess('Aluno matriculado com sucesso!');
            }
            setShowEnrollModal(false);
            fetchAlunos();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar aluno');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenTransfer = (aluno: Aluno) => {
        setSelectedAluno(aluno);
        setTransferData({ escola_destino: '', motivo: '' });
        setShowTransferModal(true);
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAluno) return;
        setSubmitting(true);
        try {
            await academicService.transferStudent(selectedAluno.id, transferData);
            setSuccess('Transferência concluída com sucesso!');
            setShowTransferModal(false);
            fetchAlunos();
        } catch (err: any) {
            setError('Erro ao transferir aluno');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenMove = (aluno: Aluno) => {
        setSelectedAluno(aluno);
        setMoveData({ nova_turma_id: aluno.turma_atual?.id?.toString() || '' });
        setShowMoveModal(true);
    };

    const handleMove = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedAluno) return;
        setSubmitting(true);
        try {
            await academicService.moveStudent(selectedAluno.id, parseInt(moveData.nova_turma_id));
            setSuccess('Aluno movido de turma com sucesso!');
            setShowMoveModal(false);
            fetchAlunos();
        } catch (err: any) {
            setError('Erro ao mover aluno');
        } finally {
            setSubmitting(false);
        }
    };

    const requestAuth = (actionType: string, payload: any) => {
        setPendingAction({ type: actionType, payload });
        setShowAuthModal(true);
        setAuthPassword('');
        setAuthError('');
    };

    const handleVerifyAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setAuthError('');
        try {
            await authService.verifyPassword(authPassword);
            setShowAuthModal(false);

            // Execute pending action
            if (pendingAction) {
                const { type, payload } = pendingAction;
                switch (type) {
                    case 'DELETE':
                        await executeDelete(payload);
                        break;
                    case 'ENROLL':
                        handleOpenEnroll(payload);
                        break;
                    case 'TRANSFER':
                        handleOpenTransfer(payload);
                        break;
                    case 'MOVE':
                        handleOpenMove(payload);
                        break;
                }
            }
            setPendingAction(null);
        } catch (err: any) {
            setAuthError(err.response?.data?.error || 'Erro de autenticação');
        } finally {
            setSubmitting(false);
        }
    };

    const executeDelete = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja remover este aluno?')) return;
        try {
            await academicService.deleteStudent(id);
            setSuccess('Aluno removido com sucesso!');
            fetchAlunos();
        } catch (err: any) {
            setError('Erro ao remover aluno');
        }
    };

    const handleViewStatus = async (aluno: Aluno) => {
        setSelectedAluno(aluno);
        setShowStatusModal(true);
        setLoadingStatus(true);
        try {
            const data = await academicService.getAcademicStatus(aluno.id);
            setAcademicStatus(data);
        } catch (err: any) {
            setError('Erro ao carregar situação académica');
        } finally {
            setLoadingStatus(false);
        }
    };

    const filteredAlunos = alunos.filter(a =>
        a.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.contacto_encarregado.includes(searchTerm)
    );

    if (loading) return (
        <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Carregando gestão de alunos...</p>
        </div>
    );

    return (
        <Container fluid className="py-2">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Gestão de Alunos</h2>
                    <p className="text-secondary mb-0">Matrículas, transferências e acompanhamento escolar</p>
                </div>
                <Button variant="primary" onClick={() => handleOpenEnroll()}>
                    <FaPlus className="me-2" /> Nova Matrícula
                </Button>
            </div>

            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Group>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0">
                                        <FaSearch className="text-muted" />
                                    </span>
                                    <Form.Control
                                        placeholder="Buscar por nome ou contacto..."
                                        className="bg-light border-start-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Select
                                value={filterClasse}
                                onChange={(e) => {
                                    setFilterClasse(e.target.value);
                                    setFilterTurma(''); // Reset turma when class changes
                                }}
                            >
                                <option value="">Todas as Classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Select
                                value={filterTurma}
                                onChange={(e) => setFilterTurma(e.target.value)}
                                disabled={!filterClasse}
                            >
                                <option value="">Todas as Turmas</option>
                                {turmas
                                    .filter(t => !filterClasse || t.classe.id.toString() === filterClasse)
                                    .map(t => <option key={t.id} value={t.id}>{t.nome} - {t.ano_letivo}</option>)}
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Button variant="outline-secondary" className="w-100" onClick={() => {
                                setFilterClasse('');
                                setFilterTurma('');
                                setSearchTerm('');
                            }}>
                                Limpar
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm">
                <Table responsive hover className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Nome Completo</th>
                            <th>Classe/Turma</th>
                            <th>Contacto</th>
                            <th>Status</th>
                            <th className="text-end">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAlunos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-4 text-muted">
                                    Nenhum aluno encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredAlunos.map(aluno => (
                                <tr key={aluno.id}>
                                    <td>
                                        <div className="fw-bold">{aluno.nome_completo}</div>
                                        <small className="text-muted">{aluno.sexo} | {new Date(aluno.data_nascimento).toLocaleDateString()}</small>
                                    </td>
                                    <td>
                                        <div>{aluno.classe_nome || aluno.classe_atual?.nome}</div>
                                        <Badge bg="info" className="fw-normal">{aluno.turma_nome || aluno.turma_atual?.nome || 'Sem Turma'}</Badge>
                                    </td>
                                    <td>{aluno.contacto_encarregado}</td>
                                    <td>
                                        <Badge bg={aluno.ativo ? 'success' : 'secondary'}>
                                            {aluno.ativo ? 'Ativo' : 'Inativo/Transferido'}
                                        </Badge>
                                    </td>
                                    <td className="text-end">
                                        <div className="d-flex justify-content-end gap-2">
                                            <Button variant="outline-primary" size="sm" onClick={() => handleViewStatus(aluno)} title="Situação Académica">
                                                <FaUserGraduate />
                                            </Button>
                                            <Button variant="outline-secondary" size="sm" onClick={() => requestAuth('MOVE', aluno)} title="Mover de Turma">
                                                <FaArrowRight />
                                            </Button>
                                            <Button variant="outline-warning" size="sm" onClick={() => requestAuth('TRANSFER', aluno)} title="Transferir Escola">
                                                <FaExchangeAlt />
                                            </Button>
                                            <Button variant="outline-info" size="sm" onClick={() => requestAuth('ENROLL', aluno)} title="Editar">
                                                <FaEdit />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => requestAuth('DELETE', aluno.id)} title="Remover">
                                                <FaTrash />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Modal: Matrícula / Edição */}
            <Modal show={showEnrollModal} onHide={() => setShowEnrollModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{selectedAluno ? 'Editar Aluno' : 'Nova Matrícula'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveStudent}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Nome Completo *</Form.Label>
                                    <Form.Control
                                        required
                                        value={studentForm.nome_completo}
                                        onChange={e => setStudentForm({ ...studentForm, nome_completo: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Data de Nascimento *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        required
                                        value={studentForm.data_nascimento}
                                        onChange={e => setStudentForm({ ...studentForm, data_nascimento: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Sexo *</Form.Label>
                                    <Form.Select
                                        value={studentForm.sexo}
                                        onChange={e => setStudentForm({ ...studentForm, sexo: e.target.value })}
                                    >
                                        <option value="HOMEM">Homem</option>
                                        <option value="MULHER">Mulher</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Classe *</Form.Label>
                                    <Form.Select
                                        required
                                        value={studentForm.classe_atual}
                                        onChange={e => setStudentForm({ ...studentForm, classe_atual: e.target.value, turma_atual: '' })}
                                    >
                                        <option value="">Selecionar...</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Turma</Form.Label>
                                    <Form.Select
                                        value={studentForm.turma_atual}
                                        onChange={e => setStudentForm({ ...studentForm, turma_atual: e.target.value })}
                                        disabled={!studentForm.classe_atual}
                                    >
                                        <option value="">Sem Turma / Pendente</option>
                                        {turmas
                                            .filter(t => t.classe.id.toString() === studentForm.classe_atual)
                                            .map(t => <option key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</option>)}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Contacto Encarregado</Form.Label>
                                    <Form.Control
                                        value={studentForm.contacto_encarregado}
                                        onChange={e => setStudentForm({ ...studentForm, contacto_encarregado: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Bairro</Form.Label>
                                    <Form.Control
                                        value={studentForm.bairro}
                                        onChange={e => setStudentForm({ ...studentForm, bairro: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Nome do Pai</Form.Label>
                                    <Form.Control
                                        value={studentForm.pai}
                                        onChange={e => setStudentForm({ ...studentForm, pai: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Nome da Mãe</Form.Label>
                                    <Form.Control
                                        value={studentForm.mae}
                                        onChange={e => setStudentForm({ ...studentForm, mae: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEnrollModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal: Transferência */}
            <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Transferir Aluno</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleTransfer}>
                    <Modal.Body>
                        <p>Transferindo <strong>{selectedAluno?.nome_completo}</strong> da escola atual.</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Escola de Destino *</Form.Label>
                            <Form.Control
                                required
                                value={transferData.escola_destino}
                                onChange={e => setTransferData({ ...transferData, escola_destino: e.target.value })}
                                placeholder="Nome da escola destino..."
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Motivo</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={transferData.motivo}
                                onChange={e => setTransferData({ ...transferData, motivo: e.target.value })}
                                placeholder="Mudança de residência, etc..."
                            />
                        </Form.Group>
                        <Alert variant="warning">
                            Esta ação marcará o aluno como inativo nesta escola.
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancelar</Button>
                        <Button variant="danger" type="submit" disabled={submitting}>
                            Confirmar Transferência
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal: Mover Turma */}
            <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Mover de Turma</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleMove}>
                    <Modal.Body>
                        <p>Mover <strong>{selectedAluno?.nome_completo}</strong> para uma nova turma.</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Nova Turma *</Form.Label>
                            <Form.Select
                                required
                                value={moveData.nova_turma_id}
                                onChange={e => setMoveData({ ...moveData, nova_turma_id: e.target.value })}
                            >
                                <option value="">Selecionar Turma...</option>
                                {turmas
                                    .filter(t => t.classe.id === selectedAluno?.classe_atual?.id)
                                    .map(t => <option key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</option>)}
                            </Form.Select>
                            <Form.Text className="text-muted">
                                Apenas turmas da mesma classe ({selectedAluno?.classe_atual?.nome}) são exibidas.
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowMoveModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            Mover Aluno
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal: Situação Académica */}
            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Situação Académica - {selectedAluno?.nome_completo}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingStatus ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2">Carregando notas...</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table bordered hover size="sm" className="text-center align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th rowSpan={2}>Disciplina</th>
                                        <th colSpan={3}>1º Trimestre</th>
                                        <th colSpan={3}>2º Trimestre</th>
                                        <th colSpan={3}>3º Trimestre</th>
                                        <th rowSpan={2}>MFD</th>
                                    </tr>
                                    <tr>
                                        <th>MAC</th><th>ACP</th><th>MT1</th>
                                        <th>MAC</th><th>ACP</th><th>MT2</th>
                                        <th>MAC</th><th>ACP</th><th>MT3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {academicStatus?.map((disc: any) => (
                                        <tr key={disc.disciplina_id}>
                                            <td className="text-start fw-bold">{disc.disciplina_nome}</td>
                                            {/* Tri 1 */}
                                            <td className="text-muted small">{disc.trimesters[1]?.macs?.toFixed(1) || '-'}</td>
                                            <td>{disc.trimesters[1]?.acp?.toFixed(1) || '-'}</td>
                                            <td className={disc.trimesters[1]?.mt < 10 ? 'text-danger fw-bold' : 'fw-bold'}>
                                                {disc.trimesters[1]?.mt?.toFixed(1) || '-'}
                                            </td>
                                            {/* Tri 2 */}
                                            <td className="text-muted small">{disc.trimesters[2]?.macs?.toFixed(1) || '-'}</td>
                                            <td>{disc.trimesters[2]?.acp?.toFixed(1) || '-'}</td>
                                            <td className={disc.trimesters[2]?.mt < 10 ? 'text-danger fw-bold' : 'fw-bold'}>
                                                {disc.trimesters[2]?.mt?.toFixed(1) || '-'}
                                            </td>
                                            {/* Tri 3 */}
                                            <td className="text-muted small">{disc.trimesters[3]?.macs?.toFixed(1) || '-'}</td>
                                            <td>{disc.trimesters[3]?.acp?.toFixed(1) || '-'}</td>
                                            <td className={disc.trimesters[3]?.mt < 10 ? 'text-danger fw-bold' : 'fw-bold'}>
                                                {disc.trimesters[3]?.mt?.toFixed(1) || '-'}
                                            </td>
                                            {/* MFD */}
                                            <td className={`bg-light fw-bold ${disc.mfd < 10 ? 'text-danger' : 'text-success'}`}>
                                                {disc.mfd?.toFixed(1) || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!academicStatus || academicStatus.length === 0) && (
                                        <tr><td colSpan={11} className="py-4">Sem notas lançadas para este aluno.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Fechar</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Autenticação Secundária */}
            <Modal show={showAuthModal} onHide={() => setShowAuthModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Verificação de Segurança</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleVerifyAuth}>
                    <Modal.Body className="text-center py-4">
                        <div className="mb-3">
                            <FaTools className="text-warning display-4" />
                        </div>
                        <h5>Acção Sensível Detectada</h5>
                        <p className="text-muted mb-4">
                            Por favor, insira a sua senha para confirmar esta operação.
                        </p>
                        {authError && <Alert variant="danger" className="text-start">{authError}</Alert>}
                        <Form.Group className="text-start">
                            <Form.Label>Sua Senha</Form.Label>
                            <Form.Control
                                type="password"
                                required
                                autoFocus
                                value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)}
                                placeholder="Digite sua senha..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAuthModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Verificando...' : 'Confirmar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default GestaoAlunos;
