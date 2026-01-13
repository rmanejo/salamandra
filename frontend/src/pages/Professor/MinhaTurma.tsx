import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { academicRoleService, academicService, evaluationService } from '../../services/api';
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
    const [showFaltas, setShowFaltas] = useState(false);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);
    const [faltaDate, setFaltaDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [faltaTipo, setFaltaTipo] = useState<'INJUSTIFICADA' | 'JUSTIFICADA'>('INJUSTIFICADA');
    const [faltaTrimestre, setFaltaTrimestre] = useState<number>(1);
    const [faltasMap, setFaltasMap] = useState<Record<string, string>>({});
    const [faltasSubmitting, setFaltasSubmitting] = useState(false);

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
            if (details?.turma_id) {
                const turmaDisciplinas = await academicService.getTurmaDisciplinasAtribuidas(details.turma_id);
                setDisciplinas(turmaDisciplinas || []);
            }
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

    useEffect(() => {
        if (showFaltas && data?.turma_id) {
            loadFaltas();
        }
    }, [showFaltas, data?.turma_id, faltaTrimestre]);

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

    const handleFaltaChange = (alunoId: number, disciplinaId: number, value: string) => {
        const key = `${alunoId}:${disciplinaId}`;
        const normalized = value.replace(/[^\d]/g, '');
        if (!normalized || normalized === '0') {
            setFaltasMap((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
            return;
        }
        setFaltasMap((prev) => ({ ...prev, [key]: normalized }));
    };

    const handleSubmitFaltas = async () => {
        if (!data?.turma_id) return;
        const selections = Object.entries(faltasMap).filter(([, checked]) => checked);
        if (selections.length === 0) {
            alert('Selecione pelo menos uma falta para lançar.');
            return;
        }

        setFaltasSubmitting(true);
        try {
            const payloads = selections.map(([key]) => {
                const [alunoId, disciplinaId] = key.split(':').map(Number);
                const quantidade = parseInt(faltasMap[key], 10);
                return {
                    aluno: alunoId,
                    turma: data.turma_id,
                    disciplina: disciplinaId,
                    data: faltaDate,
                    trimestre: faltaTrimestre,
                    quantidade,
                    tipo: faltaTipo,
                    observacao: ''
                };
            });

            const filteredPayloads = payloads.filter((payload) => payload.quantidade > 0);
            if (filteredPayloads.length === 0) {
                alert('Selecione pelo menos uma falta para lançar.');
                return;
            }

            const results = await Promise.allSettled(
                filteredPayloads.map((payload) => evaluationService.postAbsence(payload))
            );

            const failed = results.filter((r) => r.status === 'rejected').length;
            if (failed > 0) {
                alert(`Algumas faltas falharam (${failed}).`);
            } else {
                alert('Faltas lançadas com sucesso.');
            }
            await loadFaltas();
        } catch (error) {
            console.error(error);
            alert('Erro ao lançar faltas.');
        } finally {
            setFaltasSubmitting(false);
        }
    };

    const loadFaltas = async () => {
        if (!data?.turma_id) return;
        try {
            const faltasData = await evaluationService.getAbsences({
                turma_id: data.turma_id,
                trimestre: faltaTrimestre
            });
            const faltasList = Array.isArray(faltasData) ? faltasData : faltasData.results || [];
            const totals: Record<string, number> = {};
            faltasList.forEach((falta: any) => {
                if (!falta.aluno || !falta.disciplina) return;
                const key = `${falta.aluno}:${falta.disciplina}`;
                totals[key] = (totals[key] || 0) + (parseInt(falta.quantidade, 10) || 0);
            });
            const mapped: Record<string, string> = {};
            Object.entries(totals).forEach(([key, value]) => {
                if (value > 0) mapped[key] = String(value);
            });
            setFaltasMap(mapped);
        } catch (error) {
            console.error('Erro ao carregar faltas', error);
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
                    <Button variant="outline-primary" onClick={() => navigate('/relatorios')}>
                        <FaFileAlt className="me-2" /> Ver Pauta
                    </Button>
                    <Button
                        variant={showFaltas ? "danger" : "outline-danger"}
                        onClick={() => setShowFaltas((prev) => !prev)}
                    >
                        <FaFileAlt className="me-2" /> {showFaltas ? 'Ocultar Faltas' : 'Lançar Faltas'}
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

            {showFaltas && (
                <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
                    <Card className="shadow-lg border-0 bg-white" style={{ width: '95%', height: '95%' }}>
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold"><FaFileAlt className="me-2 text-danger" /> Lançamento de Faltas</h5>
                            <div className="d-flex gap-2 align-items-center">
                                <Form.Control
                                    type="date"
                                    value={faltaDate}
                                    onChange={(e) => setFaltaDate(e.target.value)}
                                />
                                <Form.Select
                                    value={faltaTipo}
                                    onChange={(e) => setFaltaTipo(e.target.value as 'INJUSTIFICADA' | 'JUSTIFICADA')}
                                >
                                    <option value="INJUSTIFICADA">Injustificada</option>
                                    <option value="JUSTIFICADA">Justificada</option>
                                </Form.Select>
                                <Form.Select
                                    value={faltaTrimestre}
                                    onChange={(e) => setFaltaTrimestre(Number(e.target.value))}
                                >
                                    <option value={1}>1º Trimestre</option>
                                    <option value={2}>2º Trimestre</option>
                                    <option value={3}>3º Trimestre</option>
                                </Form.Select>
                                <Button
                                    variant="danger"
                                    onClick={handleSubmitFaltas}
                                    disabled={faltasSubmitting || disciplinas.length === 0 || (data?.lista_alunos?.length || 0) === 0}
                                >
                                    {faltasSubmitting ? 'A lançar...' : 'Lançar Faltas'}
                                </Button>
                                <Button variant="outline-secondary" onClick={() => setShowFaltas(false)}>
                                    Fechar
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="overflow-auto">
                            {disciplinas.length === 0 ? (
                                <div className="text-muted">Nenhuma disciplina encontrada para esta turma.</div>
                            ) : (
                                <div className="table-responsive">
                                    <Table bordered hover className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="text-start">Aluno</th>
                                                {disciplinas.map((disciplina: any) => (
                                                    <th key={disciplina.id} className="text-center">
                                                        {disciplina.nome}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data?.lista_alunos?.map((aluno: any) => (
                                                <tr key={aluno.id}>
                                                    <td className="fw-semibold">{aluno.nome}</td>
                                                    {disciplinas.map((disciplina: any) => {
                                                        const key = `${aluno.id}:${disciplina.id}`;
                                                        return (
                                                            <td key={disciplina.id} className="text-center">
                                                                <Form.Control
                                                                    type="number"
                                                                    min={0}
                                                                    step={1}
                                                                    value={faltasMap[key] ?? ''}
                                                                    onChange={(e) => handleFaltaChange(aluno.id, disciplina.id, e.target.value)}
                                                                    placeholder="0"
                                                                    className="text-center"
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            )}

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
                                    <td className="px-6 py-4 text-center text-gray-500 font-medium">
                                        {aluno.numero_turma ?? index + 1}
                                    </td>
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
