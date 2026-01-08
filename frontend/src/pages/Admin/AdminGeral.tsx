import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Spinner, Alert, Modal, Tabs, Tab, Badge } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSchool, FaMapMarkerAlt, FaSync, FaLock, FaUnlock } from 'react-icons/fa';
import { adminService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface School {
    id: number;
    name: string;
    district?: { id: number; name: string } | number;
    school_type: string;
    blocked: boolean;
}

interface District {
    id: number;
    name: string;
}

const AdminGeral: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('distritos');
    
    // Distritos
    const [districts, setDistricts] = useState<District[]>([]);
    const [loadingDistricts, setLoadingDistricts] = useState(true);
    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [districtName, setDistrictName] = useState('');
    const [deletingDistrict, setDeletingDistrict] = useState<number | null>(null);

    // Escolas
    const [schools, setSchools] = useState<School[]>([]);
    const [loadingSchools, setLoadingSchools] = useState(true);
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [deletingSchool, setDeletingSchool] = useState<number | null>(null);
    const [schoolForm, setSchoolForm] = useState({
        name: '',
        district: '',
        school_type: 'PRIMARIA',
        admin_escola_email: '',
        admin_escola_password: '',
        dap_email: '',
        dap_password: '',
        adm_sector_email: '',
        adm_sector_password: '',
        admin_is_teacher: false
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isAdminSistema = user?.role === 'ADMIN_SISTEMA';

    useEffect(() => {
        if (isAdminSistema) {
            fetchDistricts();
            fetchSchools();
        }
    }, [isAdminSistema]);

    const fetchDistricts = async () => {
        setLoadingDistricts(true);
        try {
            const data = await adminService.getDistricts();
            setDistricts(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Error fetching districts:', err);
            setError('Erro ao carregar distritos');
        } finally {
            setLoadingDistricts(false);
        }
    };

    const fetchSchools = async () => {
        setLoadingSchools(true);
        try {
            const data = await adminService.getSchools();
            setSchools(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Error fetching schools:', err);
            setError('Erro ao carregar escolas');
        } finally {
            setLoadingSchools(false);
        }
    };

    // ========== DISTRITOS ==========
    const handleOpenDistrictModal = (district?: District) => {
        if (district) {
            setEditingDistrict(district);
            setDistrictName(district.name);
        } else {
            setEditingDistrict(null);
            setDistrictName('');
        }
        setError('');
        setSuccess('');
        setShowDistrictModal(true);
    };

    const handleCloseDistrictModal = () => {
        setShowDistrictModal(false);
        setEditingDistrict(null);
        setDistrictName('');
    };

    const handleSaveDistrict = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            if (editingDistrict) {
                await adminService.updateDistrict(editingDistrict.id, { name: districtName });
                setSuccess('Distrito atualizado com sucesso!');
            } else {
                await adminService.createDistrict({ name: districtName });
                setSuccess('Distrito criado com sucesso!');
            }
            handleCloseDistrictModal();
            fetchDistricts();
        } catch (err: any) {
            console.error('Error saving district:', err);
            const errorMsg = err.response?.data?.name?.[0] || err.response?.data?.error || 'Erro ao salvar distrito';
            setError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteDistrict = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja deletar este distrito? Esta ação não pode ser desfeita.')) {
            return;
        }

        setDeletingDistrict(id);
        setError('');
        setSuccess('');

        try {
            await adminService.deleteDistrict(id);
            setSuccess('Distrito deletado com sucesso!');
            fetchDistricts();
        } catch (err: any) {
            console.error('Error deleting district:', err);
            setError(err.response?.data?.error || 'Erro ao deletar distrito. Verifique se não há escolas vinculadas.');
        } finally {
            setDeletingDistrict(null);
        }
    };

    // ========== ESCOLAS ==========
    const handleOpenSchoolModal = (school?: School) => {
        if (school) {
            setEditingSchool(school);
            setSchoolForm({
                name: school.name,
                district: typeof school.district === 'object' ? school.district.id.toString() : school.district?.toString() || '',
                school_type: school.school_type,
                admin_escola_email: '',
                admin_escola_password: '',
                dap_email: '',
                dap_password: '',
                adm_sector_email: '',
                adm_sector_password: '',
                admin_is_teacher: false
            });
        } else {
            setEditingSchool(null);
            setSchoolForm({
                name: '',
                district: '',
                school_type: 'PRIMARIA',
                admin_escola_email: '',
                admin_escola_password: '',
                dap_email: '',
                dap_password: '',
                adm_sector_email: '',
                adm_sector_password: '',
                admin_is_teacher: false
            });
        }
        setError('');
        setSuccess('');
        setShowSchoolModal(true);
    };

    const handleCloseSchoolModal = () => {
        setShowSchoolModal(false);
        setEditingSchool(null);
    };

    const handleSaveSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            if (editingSchool) {
                // Para edição, apenas atualizar dados básicos
                await adminService.updateSchool(editingSchool.id, {
                    name: schoolForm.name,
                    district: parseInt(schoolForm.district),
                    school_type: schoolForm.school_type,
                    blocked: editingSchool.blocked
                });
                setSuccess('Escola atualizada com sucesso!');
            } else {
                // Para criação, incluir dados dos usuários
                await adminService.createSchool({
                    name: schoolForm.name,
                    district: parseInt(schoolForm.district),
                    school_type: schoolForm.school_type,
                    admin_escola_email: schoolForm.admin_escola_email,
                    admin_escola_password: schoolForm.admin_escola_password,
                    dap_email: schoolForm.dap_email,
                    dap_password: schoolForm.dap_password,
                    adm_sector_email: schoolForm.adm_sector_email,
                    adm_sector_password: schoolForm.adm_sector_password,
                    admin_is_teacher: schoolForm.admin_is_teacher
                });
                setSuccess('Escola criada com sucesso!');
            }
            handleCloseSchoolModal();
            fetchSchools();
        } catch (err: any) {
            console.error('Error saving school:', err);
            const errorMsg = err.response?.data?.error || 
                           err.response?.data?.non_field_errors?.[0] ||
                           Object.values(err.response?.data || {}).flat()[0] ||
                           'Erro ao salvar escola';
            setError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSchool = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja deletar esta escola? Esta ação não pode ser desfeita e deletará todos os dados relacionados.')) {
            return;
        }

        setDeletingSchool(id);
        setError('');
        setSuccess('');

        try {
            await adminService.deleteSchool(id);
            setSuccess('Escola deletada com sucesso!');
            fetchSchools();
        } catch (err: any) {
            console.error('Error deleting school:', err);
            setError(err.response?.data?.error || 'Erro ao deletar escola');
        } finally {
            setDeletingSchool(null);
        }
    };

    const handleToggleSchoolBlock = async (school: School) => {
        try {
            const districtId = typeof school.district === 'object' ? school.district.id : school.district;
            await adminService.updateSchool(school.id, {
                blocked: !school.blocked,
                name: school.name,
                district: districtId,
                school_type: school.school_type
            });
            setSuccess(`Escola ${!school.blocked ? 'bloqueada' : 'desbloqueada'} com sucesso!`);
            fetchSchools();
        } catch (err: any) {
            console.error('Error toggling school block:', err);
            setError('Erro ao alterar status da escola');
        }
    };

    if (!isAdminSistema) {
        return (
            <Container fluid>
                <Alert variant="danger">
                    Acesso negado. Apenas administradores do sistema podem acessar esta página.
                </Alert>
            </Container>
        );
    }

    const getSchoolTypeDisplay = (type: string) => {
        const types: { [key: string]: string } = {
            'PRIMARIA': 'Ensino Primário',
            'SECUNDARIA_1': 'Secundário - 1º Ciclo',
            'SECUNDARIA_2': 'Secundário - 2º Ciclo',
            'SECUNDARIA_COMPLETA': 'Secundário Completo'
        };
        return types[type] || type;
    };

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Administração Geral</h2>
                    <p className="text-secondary">Gerencie distritos e escolas do sistema</p>
                </div>
                <Button variant="outline-primary" onClick={() => { fetchDistricts(); fetchSchools(); }}>
                    <FaSync /> Atualizar
                </Button>
            </div>

            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Tabs activeKey={activeTab} onSelect={(k) => k && setActiveTab(k)} className="mb-4">
                <Tab eventKey="distritos" title={<><FaMapMarkerAlt /> Distritos</>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Gestão de Distritos</h5>
                            <Button variant="primary" onClick={() => handleOpenDistrictModal()}>
                                <FaPlus /> Novo Distrito
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {loadingDistricts ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                </div>
                            ) : (
                                <Table responsive hover className="mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Nome</th>
                                            <th className="text-end">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {districts.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-4 text-muted">
                                                    Nenhum distrito encontrado
                                                </td>
                                            </tr>
                                        ) : (
                                            districts.map((district) => (
                                                <tr key={district.id}>
                                                    <td>{district.id}</td>
                                                    <td className="fw-bold">{district.name}</td>
                                                    <td className="text-end">
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className="text-primary"
                                                            onClick={() => handleOpenDistrictModal(district)}
                                                        >
                                                            <FaEdit /> Editar
                                                        </Button>
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className="text-danger"
                                                            onClick={() => handleDeleteDistrict(district.id)}
                                                            disabled={deletingDistrict === district.id}
                                                        >
                                                            {deletingDistrict === district.id ? (
                                                                <Spinner size="sm" />
                                                            ) : (
                                                                <><FaTrash /> Deletar</>
                                                            )}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="escolas" title={<><FaSchool /> Escolas</>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Gestão de Escolas</h5>
                            <Button variant="primary" onClick={() => handleOpenSchoolModal()}>
                                <FaPlus /> Nova Escola
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {loadingSchools ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                </div>
                            ) : (
                                <Table responsive hover className="mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Nome</th>
                                            <th>Distrito</th>
                                            <th>Tipo</th>
                                            <th>Status</th>
                                            <th className="text-end">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schools.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-4 text-muted">
                                                    Nenhuma escola encontrada
                                                </td>
                                            </tr>
                                        ) : (
                                            schools.map((school) => (
                                                <tr key={school.id}>
                                                    <td>{school.id}</td>
                                                    <td className="fw-bold">{school.name}</td>
                                                    <td>
                                                        {typeof school.district === 'object' 
                                                            ? school.district.name 
                                                            : districts.find(d => d.id === school.district)?.name || '-'}
                                                    </td>
                                                    <td>{getSchoolTypeDisplay(school.school_type)}</td>
                                                    <td>
                                                        <Badge bg={school.blocked ? 'danger' : 'success'}>
                                                            {school.blocked ? 'Bloqueada' : 'Ativa'}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-end">
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className="text-primary"
                                                            onClick={() => handleOpenSchoolModal(school)}
                                                        >
                                                            <FaEdit /> Editar
                                                        </Button>
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className={school.blocked ? 'text-success' : 'text-warning'}
                                                            onClick={() => handleToggleSchoolBlock(school)}
                                                            title={school.blocked ? 'Desbloquear' : 'Bloquear'}
                                                        >
                                                            {school.blocked ? <FaUnlock /> : <FaLock />}
                                                        </Button>
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className="text-danger"
                                                            onClick={() => handleDeleteSchool(school.id)}
                                                            disabled={deletingSchool === school.id}
                                                        >
                                                            {deletingSchool === school.id ? (
                                                                <Spinner size="sm" />
                                                            ) : (
                                                                <><FaTrash /> Deletar</>
                                                            )}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Modal Distrito */}
            <Modal show={showDistrictModal} onHide={handleCloseDistrictModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingDistrict ? 'Editar Distrito' : 'Criar Novo Distrito'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveDistrict}>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label className="fw-bold">Nome do Distrito *</Form.Label>
                            <Form.Control
                                type="text"
                                value={districtName}
                                onChange={(e) => setDistrictName(e.target.value)}
                                required
                                placeholder="Ex: Maputo Cidade"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseDistrictModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting || !districtName.trim()}>
                            {submitting ? 'Salvando...' : editingDistrict ? 'Atualizar' : 'Criar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal Escola */}
            <Modal show={showSchoolModal} onHide={handleCloseSchoolModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingSchool ? 'Editar Escola' : 'Criar Nova Escola'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveSchool}>
                    <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <Row className="g-3 mb-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Nome da Escola *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={schoolForm.name}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                                        required
                                        placeholder="Ex: Escola Secundária de Maputo"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Distrito *</Form.Label>
                                    <Form.Select
                                        value={schoolForm.district}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, district: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecionar...</option>
                                        {districts.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-bold">Tipo de Escola *</Form.Label>
                                    <Form.Select
                                        value={schoolForm.school_type}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, school_type: e.target.value })}
                                        required
                                    >
                                        <option value="PRIMARIA">Ensino Primário (1ª-6ª Classe)</option>
                                        <option value="SECUNDARIA_1">Secundário - 1º Ciclo (7ª-9ª Classe)</option>
                                        <option value="SECUNDARIA_2">Secundário - 2º Ciclo (10ª-12ª Classe)</option>
                                        <option value="SECUNDARIA_COMPLETA">Secundário Completo (7ª-12ª Classe)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {!editingSchool && (
                            <>
                                <hr className="my-4" />
                                <h6 className="fw-bold mb-3">Director da Escola (ADMIN_ESCOLA)</h6>
                                <Row className="g-3 mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Email *</Form.Label>
                                            <Form.Control
                                                type="email"
                                                value={schoolForm.admin_escola_email}
                                                onChange={(e) => setSchoolForm({ ...schoolForm, admin_escola_email: e.target.value })}
                                                required={!editingSchool}
                                                placeholder="director@escola.com"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Senha *</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={schoolForm.admin_escola_password}
                                                onChange={(e) => setSchoolForm({ ...schoolForm, admin_escola_password: e.target.value })}
                                                required={!editingSchool}
                                                placeholder="Mínimo 8 caracteres"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <hr className="my-4" />
                                <h6 className="fw-bold mb-3">Director Adjunto Pedagógico (DAP)</h6>
                                <Row className="g-3 mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Email *</Form.Label>
                                            <Form.Control
                                                type="email"
                                                value={schoolForm.dap_email}
                                                onChange={(e) => setSchoolForm({ ...schoolForm, dap_email: e.target.value })}
                                                required={!editingSchool}
                                                placeholder="dap@escola.com"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Senha *</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={schoolForm.dap_password}
                                                onChange={(e) => setSchoolForm({ ...schoolForm, dap_password: e.target.value })}
                                                required={!editingSchool}
                                                placeholder="Mínimo 8 caracteres"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <hr className="my-4" />
                                <h6 className="fw-bold mb-3">Chefe da Secretaria (ADMINISTRATIVO)</h6>
                                <Row className="g-3 mb-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Email *</Form.Label>
                                            <Form.Control
                                                type="email"
                                                value={schoolForm.adm_sector_email}
                                                onChange={(e) => setSchoolForm({ ...schoolForm, adm_sector_email: e.target.value })}
                                                required={!editingSchool}
                                                placeholder="secretaria@escola.com"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Senha *</Form.Label>
                                            <Form.Control
                                                type="password"
                                                value={schoolForm.adm_sector_password}
                                                onChange={(e) => setSchoolForm({ ...schoolForm, adm_sector_password: e.target.value })}
                                                required={!editingSchool}
                                                placeholder="Mínimo 8 caracteres"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Check
                                    type="checkbox"
                                    label="Director também é Professor"
                                    checked={schoolForm.admin_is_teacher}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, admin_is_teacher: e.target.checked })}
                                    className="mt-3"
                                />
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseSchoolModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? 'Salvando...' : editingSchool ? 'Atualizar' : 'Criar Escola'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default AdminGeral;
