import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { academicService, daeService, administrativeService } from '../../services/api';

interface Teacher {
    id: number;
    full_name: string;
    nome_com_cargos: string;
    disciplinas_nomes: string;
    user_email: string;
    formacao: string;
    area_formacao: string;
}

const GestaoCargosProfessores: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Selection data
    const [turmas, setTurmas] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [disciplinas, setDisciplinas] = useState<any[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [assignment, setAssignment] = useState({
        cargo_tipo: 'DT' as 'DT' | 'CC' | 'DD',
        entidade_id: '',
        ano_letivo: new Date().getFullYear()
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tData, turData, clData, discData] = await Promise.all([
                academicService.getTeachers(),
                academicService.getTurmas(),
                academicService.getClasses(),
                administrativeService.getDisciplinas()
            ]);
            setTeachers(tData);
            setTurmas(turData);
            setClasses(clData);
            setDisciplinas(discData);
        } catch (err) {
            setError('Erro ao carregar dados dos professores e entidades.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setAssignment({
            cargo_tipo: 'DT',
            entidade_id: '',
            ano_letivo: new Date().getFullYear()
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacher || !assignment.entidade_id) return;

        setSubmitting(true);
        setError('');
        try {
            await daeService.atribuirCargo({
                professor_id: selectedTeacher.id,
                cargo_tipo: assignment.cargo_tipo,
                entidade_id: parseInt(assignment.entidade_id),
                ano_letivo: assignment.ano_letivo
            });
            setSuccess(`Cargo atribuído com sucesso ao Prof. ${selectedTeacher.full_name}`);
            setShowModal(false);
            fetchData(); // Refresh list to show updated roles in names
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao atribuir cargo');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container fluid className="py-4">
            <h2 className="fw-bold text-navy mb-4">Gestão de Cargos Pedagógicos</h2>

            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3">Professor</th>
                                <th className="py-3">Formação</th>
                                <th className="py-3">Disciplinas</th>
                                <th className="py-3 text-center">Acções</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-5"><Spinner animation="border" /></td></tr>
                            ) : teachers.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-5 text-muted">Nenhum professor registado.</td></tr>
                            ) : teachers.map((teacher) => (
                                <tr key={teacher.id} className="align-middle">
                                    <td className="px-4">
                                        <div className="fw-bold">{teacher.nome_com_cargos || teacher.full_name}</div>
                                        <div className="small text-muted">{teacher.user_email}</div>
                                    </td>
                                    <td><Badge bg="info">{teacher.formacao}</Badge></td>
                                    <td className="small">{teacher.disciplinas_nomes || "-"}</td>
                                    <td className="text-center">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleOpenModal(teacher)}
                                        >
                                            Atribuir Cargo
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={() => !submitting && setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h5">Atribuir Cargo Pedagógico</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <p className="small text-muted mb-3">
                            Selecionar o cargo e a entidade (Turma, Classe ou Disciplina) para o professor <strong>{selectedTeacher?.full_name}</strong>.
                        </p>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Tipo de Cargo</Form.Label>
                            <Form.Select
                                value={assignment.cargo_tipo}
                                onChange={e => setAssignment({ ...assignment, cargo_tipo: e.target.value as any, entidade_id: '' })}
                            >
                                <option value="DT">Director de Turma (DT)</option>
                                <option value="CC">Coordenador de Classe (CC)</option>
                                <option value="DD">Delegado de Disciplina (DD)</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">
                                {assignment.cargo_tipo === 'DT' ? 'Turma' : assignment.cargo_tipo === 'CC' ? 'Classe' : 'Disciplina'}
                            </Form.Label>
                            <Form.Select
                                required
                                value={assignment.entidade_id}
                                onChange={e => setAssignment({ ...assignment, entidade_id: e.target.value })}
                            >
                                <option value="">Seleccione...</option>
                                {assignment.cargo_tipo === 'DT' && turmas.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome} - {t.classe_nome} ({t.ano_letivo})</option>
                                ))}
                                {assignment.cargo_tipo === 'CC' && classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                                {assignment.cargo_tipo === 'DD' && disciplinas.map(d => (
                                    <option key={d.id} value={d.id}>{d.nome}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">Ano Lectivo</Form.Label>
                            <Form.Control
                                type="number"
                                required
                                value={assignment.ano_letivo}
                                onChange={e => setAssignment({ ...assignment, ano_letivo: parseInt(e.target.value) })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                            {submitting ? 'Atribuindo...' : 'Confirmar Atribuição'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default GestaoCargosProfessores;
