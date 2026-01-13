import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { academicRoleService, academicService } from '../../services/api';
import { FaUserGraduate, FaChartPie, FaFileAlt, FaExchangeAlt, FaSchool, FaEllipsisV, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';


const getStatusColor = (status: string) => {
    switch (status) {
        case 'DESISTENTE': return 'bg-red-50 hover:bg-red-100';
        case 'TRANSFERIDO': return 'bg-green-50 hover:bg-green-100';
        default: return 'hover:bg-gray-50';
    }
};

const getStatusTextColor = (status: string) => {
    switch (status) {
        case 'DESISTENTE': return 'text-red-700 font-bold';
        case 'TRANSFERIDO': return 'text-green-700 font-bold';
        default: return 'text-gray-500';
    }
};

const MinhaTurma: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Cargo Assignment Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [cargo, setCargo] = useState('');

    // Transfer/Move Modals
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);

    const [formSubmitting, setFormSubmitting] = useState(false);
    const [moveData, setMoveData] = useState({ nova_turma_id: '' });
    const [transferData, setTransferData] = useState({ escola_destino: '', motivo: '' });
    const [turmasDisponiveis, setTurmasDisponiveis] = useState<any[]>([]);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchTurmas = async () => {
            // Fetch classes of same grade for moving
            // Ideally we should have an endpoint for this, reusing getCCTurmas or similar might be tricky if not CC
            // For now relying on available logic or simplified fetch
        };
        fetchTurmas();
    }, []);

    const fetchData = async () => {
        try {
            const details = await academicRoleService.getDTDetalhes();
            setData(details);
            // Fetch turmas for moving (assume same class)
            // Simplified: we'll fetch all turmas of the school and filter or use a specific endpoint if needed.
            // For this iteration, we might need a helper to get turmas of same class.
            // Let's retry list of turmas from general endpoint if possible or assume user knows ID.
            // BETTER: Load basic list of turmas for the school to filter by class name if possible
            // But DT might restricted. Let's try `academicService.getTurmas`.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch turmas for moving dialog
    const handleOpenMove = async (student: any) => {
        setSelectedStudent(student);
        try {
            const allTurmas = await academicService.getTurmas();
            setTurmasDisponiveis(allTurmas);
        } catch (e) {
            console.log("Erro ao carregar turmas", e);
        }
        setMoveData({ nova_turma_id: '' });
        setShowMoveModal(true);
    }


    useEffect(() => {
        fetchData();
    }, []);

    const handleEditCargo = (student: any) => {
        setSelectedStudent(student);
        setCargo(student.cargo !== 'Nenhum' ? student.cargo : '');
        setShowModal(true);
    };

    const handleSaveCargo = async () => {
        if (!selectedStudent) return;
        try {
            await academicRoleService.setAlunoCargo({
                aluno_id: selectedStudent.id,
                cargo: cargo || 'Nenhum'
            });
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving cargo:', error);
            alert('Erro ao atribuir cargo.');
        }
    };

    const handleMoveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitting(true);
        try {
            await academicRoleService.moverAluno({
                aluno_id: selectedStudent.id,
                nova_turma_id: parseInt(moveData.nova_turma_id)
            });
            setShowMoveModal(false);
            fetchData();
        } catch (err) {
            alert('Erro ao mover aluno.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleOpenTransfer = (student: any) => {
        setSelectedStudent(student);
        setShowTransferModal(true);
    };

    const handleTransferStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitting(true);
        try {
            await academicRoleService.transferirAluno({
                aluno_id: selectedStudent.id,
                escola_destino: transferData.escola_destino,
                motivo: transferData.motivo
            });
            setShowTransferModal(false);
            fetchData();
        } catch (err) {
            alert('Erro ao transferir aluno.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleToggleStatus = async (studentId: number, status: 'ATIVO' | 'DESISTENTE' | 'TRANSFERIDO') => {
        try {
            await academicRoleService.definirStatusAluno({ aluno_id: studentId, status });
            fetchData();
        } catch (error) {
            console.error("Error updating student status", error);
            alert("Erro ao atualizar status do aluno");
        }
    };

    if (loading) return <div className="p-5 text-center"><Spinner animation="border" /></div>;
    if (!data) return <div className="p-5 text-center">Nenhuma turma atribuída encontrada.</div>;

    // Helper to import academicService locally to use getTurmas
    // We need to add it to imports

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="text-navy fw-bold mb-0">Minha Turma: {data.turma}</h2>
                    <p className="text-muted">Gerenciamento e Estatísticas Detalhadas</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-danger" onClick={() => navigate('/professor/faltas')}>
                        <FaFileAlt className="me-2" /> Lançar Faltas
                    </Button>
                    <Button variant="outline-primary" onClick={() => navigate('/relatorios')}>
                        <FaFileAlt className="me-2" /> Ver Pauta
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <Row className="g-4 mb-4">
                <Col md={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body className="text-center">
                            <h6 className="text-muted text-uppercase mb-2">Total Alunos</h6>
                            <h2 className="fw-bold text-navy mb-0">{data.total_alunos}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body className="text-center">
                            <h6 className="text-muted text-uppercase mb-2">Homens</h6>
                            <h2 className="fw-bold text-primary mb-0">{data.total_homens}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body className="text-center">
                            <h6 className="text-muted text-uppercase mb-2">Mulheres</h6>
                            <h2 className="fw-bold text-danger mb-0">{data.total_mulheres}</h2>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Age Chart/Table */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 fw-bold"><FaChartPie className="me-2 text-primary" /> Distribuição por Idades</h5>
                </Card.Header>
                <Card.Body>
                    <Table bordered hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Idade</th>
                                <th className="text-center">Homens</th>
                                <th className="text-center">Mulheres</th>
                                <th className="text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(data.idades).map(([age, counts]: [string, any]) => (
                                <tr key={age}>
                                    <td className="fw-bold">{age} anos</td>
                                    <td className="text-center">{counts.homens}</td>
                                    <td className="text-center">{counts.mulheres}</td>
                                    <td className="text-center fw-bold">{counts.homens + counts.mulheres}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Student List */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FaUserGraduate className="text-blue-500" />
                        Lista Nominal de Alunos
                    </h2>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                        {data?.lista_alunos?.length || 0} Alunos
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-gray-600 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4 text-center font-bold">Nº</th>
                                <th className="px-6 py-4 text-left font-bold">Nome Completo / Idade</th>
                                <th className="px-6 py-4 text-center font-bold">Sexo</th>
                                <th className="px-6 py-4 text-left font-bold">Residência / Bairro</th>
                                <th className="px-6 py-4 text-center font-bold">Filiação</th>
                                <th className="px-6 py-4 text-center font-bold">Contactos</th>
                                <th className="px-6 py-4 text-center font-bold">Cargo / Status</th>
                                <th className="px-6 py-4 text-right font-bold">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data?.lista_alunos?.map((aluno: any, index: number) => (
                                <tr key={aluno.id} className={`transition-colors ${getStatusColor(aluno.status)}`}>
                                    <td className="px-6 py-4 text-center text-gray-500 font-medium">{index + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{aluno.nome}</div>
                                        <div className="text-xs text-gray-500 font-medium">{aluno.idade} anos • {new Date(aluno.data_nascimento).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${aluno.sexo === 'HOMEM' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                            {aluno.sexo === 'HOMEM' ? 'M' : 'F'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-700">{aluno.bairro || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-500"><span className="font-semibold">P:</span> {aluno.pai || '-'}</div>
                                        <div className="text-xs text-gray-500"><span className="font-semibold">M:</span> {aluno.mae || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-bold text-blue-600">{aluno.contacto_encarregado || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-sm font-semibold text-gray-700">{aluno.cargo}</div>
                                        <div className={`text-xs uppercase tracking-wider ${getStatusTextColor(aluno.status)}`}>
                                            {aluno.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenMove(aluno)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Mover Turma"
                                            >
                                                <FaExchangeAlt />
                                            </button>
                                            <button
                                                onClick={() => handleOpenTransfer(aluno)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Transferir Escola"
                                            >
                                                <FaSchool />
                                            </button>

                                            <div className="relative group">
                                                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <FaEllipsisV />
                                                </button>
                                                <div className="hidden group-hover:block absolute right-0 mt-0 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden">
                                                    {aluno.status !== 'ATIVO' && (
                                                        <button
                                                            onClick={() => handleToggleStatus(aluno.id, 'ATIVO')}
                                                            className="w-full text-left px-4 py-3 text-sm text-green-600 hover:bg-green-50 font-bold flex items-center gap-2"
                                                        >
                                                            <FaCheckCircle /> Marcar como Ativo
                                                        </button>
                                                    )}
                                                    {aluno.status !== 'DESISTENTE' && (
                                                        <button
                                                            onClick={() => handleToggleStatus(aluno.id, 'DESISTENTE')}
                                                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"
                                                        >
                                                            <FaTimesCircle /> Marcar Desistente
                                                        </button>
                                                    )}
                                                    {aluno.status !== 'TRANSFERIDO' && (
                                                        <button
                                                            onClick={() => handleToggleStatus(aluno.id, 'TRANSFERIDO')}
                                                            className="w-full text-left px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 font-bold flex items-center gap-2"
                                                        >
                                                            <FaExchangeAlt /> Marcar Transferido
                                                        </button>
                                                    )}
                                                    <div className="border-t border-gray-50"></div>
                                                    <button
                                                        onClick={() => handleEditCargo(aluno)}
                                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 font-bold"
                                                    >
                                                        Alterar Cargo
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Assign Cargo */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Atribuir Cargo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Aluno: <strong>{selectedStudent?.nome}</strong></Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Ex: Chefe de Turma, Chefe Adjunto..."
                            value={cargo}
                            onChange={(e) => setCargo(e.target.value)}
                            autoFocus
                        />
                        <Form.Text className="text-muted">
                            Deixe em branco para remover o cargo.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveCargo}>Salvar</Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Transfer */}
            <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Transferir Aluno</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleTransferStudent}>
                    <Modal.Body>
                        <p>Transferindo <strong>{selectedStudent?.nome}</strong>.</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Escola de Destino *</Form.Label>
                            <Form.Control
                                required
                                value={transferData.escola_destino}
                                onChange={e => setTransferData({ ...transferData, escola_destino: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Motivo</Form.Label>
                            <Form.Control
                                as="textarea"
                                value={transferData.motivo}
                                onChange={e => setTransferData({ ...transferData, motivo: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancelar</Button>
                        <Button variant="danger" type="submit" disabled={formSubmitting}>Confirmar Transferência</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal Move */}
            <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Mover de Turma</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleMoveStudent}>
                    <Modal.Body>
                        <p>Mover <strong>{selectedStudent?.nome}</strong>.</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Nova Turma *</Form.Label>
                            <Form.Select
                                required
                                value={moveData.nova_turma_id}
                                onChange={e => setMoveData({ ...moveData, nova_turma_id: e.target.value })}
                            >
                                <option value="">Selecionar Turma...</option>
                                {turmasDisponiveis.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowMoveModal(false)}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={formSubmitting}>Mover</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

        </Container>
    );
};

export default MinhaTurma;
