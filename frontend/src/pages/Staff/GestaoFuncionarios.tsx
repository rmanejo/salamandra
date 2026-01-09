import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { administrativeService, authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface StaffMember {
    id: number;
    user_details: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
    };
    cargo: string;
    sector: string | null;
    tipo_provimento: string;
    formacao?: string;
    area_formacao?: string;
}

interface StaffRegistrationFormData {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role: string;
    cargo: string;
    sector: string;
    tipo_provimento: string;
    formacao: string;
    area_formacao: string;
    is_teacher: boolean;
    disciplina_ids: number[];
}

const GestaoFuncionarios: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Modal Registry
    const [showRegModal, setShowRegModal] = useState(false);
    const [regType, setRegType] = useState<'TECNICO' | 'DOCENTE'>('TECNICO');
    const [formData, setFormData] = useState<StaffRegistrationFormData>({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'ADMINISTRATIVO',
        cargo: '',
        sector: '',
        tipo_provimento: 'PROVISORIO',
        formacao: '',
        area_formacao: '',
        is_teacher: false,
        disciplina_ids: []
    });

    // Secondary Auth Modal
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [pendingDelete, setPendingDelete] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Subjects List
    const [disciplinas, setDisciplinas] = useState<any[]>([]);

    const handleEdit = (member: StaffMember) => {
        setEditingId(member.id);
        setRegType(member.user_details.role === 'PROFESSOR' ? 'DOCENTE' : 'TECNICO');
        setFormData({
            email: member.user_details.email,
            first_name: member.user_details.first_name,
            last_name: member.user_details.last_name,
            password: '', // Password optional on edit
            role: member.user_details.role,
            cargo: member.cargo || '',
            sector: member.sector || '',
            tipo_provimento: member.tipo_provimento,
            formacao: member.formacao || '',
            area_formacao: member.area_formacao || '',
            is_teacher: member.user_details.role === 'PROFESSOR',
            disciplina_ids: [] // Loading existing disciplines would require fetching detailed profile
        });
        setShowRegModal(true);
    };

    useEffect(() => {
        fetchStaff();
        fetchDisciplinas();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const data = await administrativeService.getStaffMembers();
            setStaff(data);
        } catch (err) {
            setError('Erro ao carregar lista de funcionários');
        } finally {
            setLoading(false);
        }
    };

    const fetchDisciplinas = async () => {
        try {
            const data = await administrativeService.getDisciplinas();
            setDisciplinas(data);
        } catch (err) {
            console.error("Erro ao carregar disciplinas", err);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        let payload: any = {
            ...formData,
            is_teacher: regType === 'DOCENTE',
            role: regType === 'DOCENTE' ? 'PROFESSOR' : 'ADMINISTRATIVO'
        };

        if (regType === 'TECNICO') {
            const { formacao, area_formacao, disciplina_ids, ...tecnicoPayload } = payload;
            payload = tecnicoPayload;
        } else {
            const { sector, ...docentePayload } = payload;
            payload = docentePayload;
        }

        try {
            if (editingId) {
                // Update
                const { password, ...updatePayload } = payload;
                if (formData.password) { updatePayload.password = formData.password; }

                await administrativeService.updateStaff(editingId, updatePayload);
                setSuccess('Funcionário actualizado com sucesso!');
            } else {
                // Register
                await administrativeService.registerStaff(payload);
                setSuccess('Funcionário registado com sucesso!');
            }
            setShowRegModal(false);
            fetchStaff();
            resetForm();
        } catch (err: any) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                // If it's a validation error object from DRF
                const firstErrorField = Object.keys(data)[0];
                const errorMsg = Array.isArray(data[firstErrorField]) ? data[firstErrorField][0] : JSON.stringify(data);
                setError(`${firstErrorField}: ${errorMsg}`);
            } else {
                setError(data?.message || 'Erro ao registar funcionário');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            first_name: '',
            last_name: '',
            password: '',
            role: regType === 'DOCENTE' ? 'PROFESSOR' : 'ADMINISTRATIVO',
            cargo: '',
            sector: '',
            tipo_provimento: 'PROVISORIO',
            formacao: '',
            area_formacao: '',
            is_teacher: regType === 'DOCENTE',
            disciplina_ids: []
        });
        setEditingId(null);
    };

    const requestDelete = (id: number) => {
        setPendingDelete(id);
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
            if (pendingDelete) {
                await administrativeService.deleteStaff(pendingDelete);
                setSuccess('Funcionário removido com sucesso');
                fetchStaff();
            }
            setShowAuthModal(false);
            setPendingDelete(null);
        } catch (err: any) {
            setAuthError(err.response?.data?.error || 'Senha incorrecta ou erro de autenticação');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN_ESCOLA': return <Badge bg="danger">Director</Badge>;
            case 'DAP': return <Badge bg="warning" text="dark">DAP</Badge>;
            case 'DAE': return <Badge bg="info">DAE</Badge>;
            case 'PROFESSOR': return <Badge bg="primary">Professor</Badge>;
            default: return <Badge bg="secondary">Administrativo</Badge>;
        }
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold text-navy">Gestão de Recursos Humanos</h2>
                <Button variant="primary" onClick={() => setShowRegModal(true)}>
                    Registar Novo Funcionário
                </Button>
            </div>

            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3">Nome</th>
                                <th className="py-3">Cargo/Role</th>
                                <th className="py-3">Sector/Formação</th>
                                <th className="py-3">Provimento</th>
                                <th className="py-3 text-center">Acções</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-5"><Spinner animation="border" /></td></tr>
                            ) : staff.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-5 text-muted">Nenhum funcionário registado.</td></tr>
                            ) : staff.map((member) => (
                                <tr key={member.id} className="align-middle">
                                    <td className="px-4">
                                        <div className="fw-bold">{member.user_details.first_name} {member.user_details.last_name}</div>
                                        <div className="small text-muted">{member.user_details.email}</div>
                                    </td>
                                    <td>
                                        <div className="mb-1">{getRoleBadge(member.user_details.role)}</div>
                                        <div className="small text-uppercase">{member.cargo}</div>
                                    </td>
                                    <td>
                                        {member.sector ? (
                                            <span className="small">
                                                {member.sector === 'DIRECAO' ? 'Direção/Gestão' :
                                                    member.sector === 'PEDAGOGICO' ? 'Pedagógico' :
                                                        member.sector === 'RH' ? 'Recursos Humanos' :
                                                            member.sector === 'APOIO' ? 'Apoio Admin.' :
                                                                member.sector === 'SECRETARIA' ? 'Secretaria' : member.sector}
                                            </span>
                                        ) : member.formacao ? (
                                            <span className="small">{member.formacao} - {member.area_formacao}</span>
                                        ) : "-"}
                                    </td>
                                    <td>
                                        <Badge bg={member.tipo_provimento === 'DEFINITIVO' ? "success" : "light"} text={member.tipo_provimento === 'DEFINITIVO' ? "white" : "dark"}>
                                            {member.tipo_provimento}
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        {/* Protection: Hide buttons for Direcção and Secretaria */}
                                        {!['ADMIN_ESCOLA', 'DAP', 'DAE'].includes(member.user_details.role) && member.sector !== 'SECRETARIA' && (
                                            <>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => handleEdit(member)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => requestDelete(member.id)}
                                                    disabled={member.user_details.id === currentUser?.id}
                                                >
                                                    Remover
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Registration Modal */}
            <Modal show={showRegModal} onHide={() => !submitting && setShowRegModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Registar Funcionário</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleRegister}>
                    <Modal.Body>
                        <div className="mb-4 d-flex gap-3">
                            <Button
                                variant={regType === 'TECNICO' ? "primary" : "outline-primary"}
                                onClick={() => { setRegType('TECNICO'); setFormData({ ...formData, role: 'ADMINISTRATIVO' }); }}
                            >
                                Funcionário Técnico
                            </Button>
                            <Button
                                variant={regType === 'DOCENTE' ? "primary" : "outline-primary"}
                                onClick={() => { setRegType('DOCENTE'); setFormData({ ...formData, role: 'PROFESSOR' }); }}
                            >
                                Funcionário Docente
                            </Button>
                        </div>

                        <Row>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Primeiro Nome</Form.Label>
                                    <Form.Control
                                        required
                                        value={formData.first_name}
                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Apelido</Form.Label>
                                    <Form.Control
                                        required
                                        value={formData.last_name}
                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Email (Login)</Form.Label>
                                    <Form.Control
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Senha Inicial</Form.Label>
                                    <Form.Control
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        <hr />

                        <Row>
                            <Col md={6} className="mb-3">
                                <Form.Group>
                                    <Form.Label>Tipo de Provimento</Form.Label>
                                    <Form.Select
                                        value={formData.tipo_provimento}
                                        onChange={e => setFormData({ ...formData, tipo_provimento: e.target.value })}
                                    >
                                        <option value="PROVISORIO">Provisório</option>
                                        <option value="DEFINITIVO">Definitivo</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {regType === 'TECNICO' ? (
                                <Col md={6} className="mb-3">
                                    <Form.Group>
                                        <Form.Label>Sector</Form.Label>
                                        <Form.Select
                                            required
                                            value={formData.sector}
                                            onChange={e => setFormData({ ...formData, sector: e.target.value })}
                                        >
                                            <option value="">Seleccione o Sector</option>
                                            <option value="SECRETARIA">Secretaria</option>
                                            <option value="RH">Recursos Humanos</option>
                                            <option value="APOIO">Apoio Administrativo</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            ) : (
                                <>
                                    <Col md={3} className="mb-3">
                                        <Form.Group>
                                            <Form.Label>Nível Formação</Form.Label>
                                            <Form.Select
                                                required
                                                value={formData.formacao}
                                                onChange={e => setFormData({ ...formData, formacao: e.target.value })}
                                            >
                                                <option value="">Nível</option>
                                                <option value="N4">N4</option>
                                                <option value="N3">N3</option>
                                                <option value="N2">N2</option>
                                                <option value="N1">N1</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="mb-3">
                                        <Form.Group>
                                            <Form.Label>Área Formação</Form.Label>
                                            <Form.Control
                                                required
                                                value={formData.area_formacao}
                                                onChange={e => setFormData({ ...formData, area_formacao: e.target.value })}
                                            />
                                        </Form.Group>
                                    </Col>
                                </>
                            )}
                        </Row>

                        {regType === 'DOCENTE' && (
                            <Row>
                                <Col md={12} className="mb-3">
                                    <Form.Group>
                                        <Form.Label className="fw-bold">Disciplinas que Lecciona</Form.Label>
                                        <div className="d-flex flex-wrap gap-2 p-3 border rounded bg-light">
                                            {disciplinas.length === 0 ? (
                                                <small className="text-muted">Nenhuma disciplina configurada na escola.</small>
                                            ) : disciplinas.map(d => (
                                                <Form.Check
                                                    key={d.id}
                                                    type="checkbox"
                                                    id={`subject-${d.id}`}
                                                    label={d.nome}
                                                    checked={formData.disciplina_ids.includes(d.id)}
                                                    onChange={e => {
                                                        const ids = e.target.checked
                                                            ? [...formData.disciplina_ids, d.id]
                                                            : formData.disciplina_ids.filter((id: number) => id !== d.id);
                                                        setFormData({ ...formData, disciplina_ids: ids });
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light" onClick={() => setShowRegModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'A processar...' : 'Confirmar Registo'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Secondary Auth Modal */}
            <Modal show={showAuthModal} onHide={() => !submitting && setShowAuthModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h5">Autenticação de Segurança</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleVerifyAuth}>
                    <Modal.Body>
                        <p className="small text-muted mb-3">
                            Para remover um funcionário, confirme a sua identidade digitando a sua senha de acesso.
                        </p>
                        {authError && <Alert variant="danger" className="py-2 small">{authError}</Alert>}
                        <Form.Group>
                            <Form.Label className="small fw-bold">Sua Senha</Form.Label>
                            <Form.Control
                                type="password"
                                autoFocus
                                required
                                value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light" size="sm" onClick={() => setShowAuthModal(false)}>Cancelar</Button>
                        <Button variant="danger" size="sm" type="submit" disabled={submitting}>
                            {submitting ? 'Verificando...' : 'Confirmar Remoção'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default GestaoFuncionarios;
