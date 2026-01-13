import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Spinner } from 'react-bootstrap';
import { FaFilePdf, FaFileExcel, FaSearch } from 'react-icons/fa';
import { academicRoleService, academicService, reportService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Reports: React.FC = () => {
    const { user } = useAuth();
    const [turmas, setTurmas] = useState<any[]>([]);
    const [selectedTurma, setSelectedTurma] = useState('');
    const [selectedTrimestre, setSelectedTrimestre] = useState('1');
    const [pautaData, setPautaData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetchingBase, setFetchingBase] = useState(true);

    const [declaracaoTurma, setDeclaracaoTurma] = useState('');
    const [declaracaoAluno, setDeclaracaoAluno] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [declaracaoData, setDeclaracaoData] = useState<any>(null);
    const [loadingDeclaracao, setLoadingDeclaracao] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);

    const reportAdmins = ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO'];
    const isReportAdmin = !!user && reportAdmins.includes(user.role);
    const isProfessorDT = !!user && user.role === 'PROFESSOR' && !!user.academic_roles?.is_dt;
    const isProfessorCC = !!user && user.role === 'PROFESSOR' && !!user.academic_roles?.is_cc;
    const canViewPauta = isReportAdmin || isProfessorDT || isProfessorCC;
    const canViewDeclaracao = isReportAdmin || isProfessorDT;

    useEffect(() => {
        const fetchBaseData = async () => {
            try {
                let turmasList: any[] = [];
                if (isReportAdmin) {
                    const turmasRes = await academicService.getTurmas();
                    turmasList = Array.isArray(turmasRes) ? turmasRes : turmasRes.results || [];
                } else if (isProfessorDT) {
                    const dtDetails = await academicRoleService.getDTDetalhes();
                    const turmasRes = await academicService.getTurmas();
                    const allTurmas = Array.isArray(turmasRes) ? turmasRes : turmasRes.results || [];
                    turmasList = allTurmas.filter((t: any) => t.id === dtDetails?.turma_id);
                } else if (isProfessorCC) {
                    const ccTurmas = await academicRoleService.getCCTurmas();
                    const flattened: any[] = [];
                    (ccTurmas || []).forEach((entry: any) => {
                        (entry.turmas || []).forEach((turma: any) => {
                            flattened.push({
                                ...turma,
                                classe_nome: entry.classe
                            });
                        });
                    });
                    turmasList = flattened;
                }

                setTurmas(turmasList);
            } catch (error) {
                console.error('Error fetching base data for reports:', error);
            } finally {
                setFetchingBase(false);
            }
        };
        fetchBaseData();
    }, [isReportAdmin, isProfessorDT, isProfessorCC]);

    useEffect(() => {
        const loadStudents = async () => {
            if (!declaracaoTurma) {
                setStudents([]);
                setDeclaracaoAluno('');
                return;
            }
            setLoadingStudents(true);
            try {
                const studentsRes = await academicService.getStudents({ turma_id: declaracaoTurma });
                const list = Array.isArray(studentsRes) ? studentsRes : studentsRes.results || [];
                setStudents(list);
            } catch (error) {
                console.error('Error fetching students for declaration:', error);
                setStudents([]);
            } finally {
                setLoadingStudents(false);
            }
        };
        loadStudents();
    }, [declaracaoTurma]);

    const handleGeneratePauta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTurma) return;

        setLoading(true);
        try {
            setDeclaracaoData(null);
            const data = await reportService.getClassReportGeneral({
                turma_id: parseInt(selectedTurma),
                trimestre: parseInt(selectedTrimestre)
            });
            setPautaData(data);
        } catch (error) {
            console.error('Error generating pauta:', error);
            alert('Erro ao gerar pauta. Verifique se os dados estão corretos.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDeclaracao = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!declaracaoAluno) return;

        setLoadingDeclaracao(true);
        try {
            setPautaData(null);
            const data = await reportService.getStudentDeclaration({
                aluno_id: parseInt(declaracaoAluno)
            });
            setDeclaracaoData(data);
        } catch (error) {
            console.error('Error generating declaracao:', error);
            alert('Erro ao gerar declaração. Verifique os dados.');
        } finally {
            setLoadingDeclaracao(false);
        }
    };

    if (fetchingBase) return <div className="p-4"><Spinner animation="border" size="sm" /> Carregando opções...</div>;

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4 text-navy fw-bold">Relatórios e Pautas</h2>

            <Row className="mb-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Filtros para Pauta Trimestral</h6>
                            {!canViewPauta ? (
                                <div className="text-muted">Sem permissão para gerar pauta.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleGeneratePauta}>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={selectedTurma}
                                                onChange={(e) => setSelectedTurma(e.target.value)}
                                                required
                                            >
                                                <option value="">Selecionar Turma</option>
                                                {turmas.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.nome} - {t.classe_nome || t.classe?.nome || '-'}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Trimestre</Form.Label>
                                            <Form.Select
                                                value={selectedTrimestre}
                                                onChange={(e) => setSelectedTrimestre(e.target.value)}
                                            >
                                                <option value="1">1º Trimestre</option>
                                                <option value="2">2º Trimestre</option>
                                                <option value="3">3º Trimestre</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loading}
                                        >
                                            {loading ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                                            Gerar Pauta
                                        </Button>
                                    </Col>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {pautaData && (
                <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
                    <Card className="shadow-lg border-0 bg-white" style={{ width: '95%', height: '95%' }}>
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                            <div>
                                <h5 className="mb-0 fw-bold">Pauta Geral - {pautaData.turma}</h5>
                                <small className="text-secondary">{pautaData.escola} | Ano: {pautaData.ano_letivo} | Trimestre: {pautaData.trimestre}</small>
                            </div>
                            <div className="d-flex gap-2">
                                <Button variant="outline-danger" size="sm" className="d-flex align-items-center gap-2 px-3">
                                    <FaFilePdf /> PDF
                                </Button>
                                <Button variant="outline-success" size="sm" className="d-flex align-items-center gap-2 px-3">
                                    <FaFileExcel /> Excel
                                </Button>
                                <Button variant="outline-secondary" size="sm" onClick={() => setPautaData(null)}>
                                    Fechar
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0 overflow-auto">
                            <div className="table-responsive">
                                <Table hover className="mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">Nome do Aluno</th>
                                            {pautaData.disciplinas.map((disc: any) => (
                                                <th key={disc.id} className="text-center">{disc.nome}</th>
                                            ))}
                                            <th className="text-center">Média</th>
                                            <th className="text-center">Situação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pautaData.pauta.map((aluno: any) => (
                                            <tr key={aluno.id}>
                                                <td className="ps-3 fw-medium">{aluno.nome}</td>
                                                {pautaData.disciplinas.map((disc: any) => (
                                                    <td key={disc.id} className="text-center">
                                                        {aluno.disciplinas?.[disc.id] ?? '-'}
                                                    </td>
                                                ))}
                                                <td className="text-center fw-bold">{aluno.media_final ?? '-'}</td>
                                                <td className="text-center">
                                                    <span className={`badge ${aluno.situacao === 'Aprovado' ? 'bg-success' : aluno.situacao === 'Reprovado' ? 'bg-danger' : 'bg-secondary'}`}>
                                                        {aluno.situacao}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            )}

            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Declaração do Aluno</h6>
                            {!canViewDeclaracao ? (
                                <div className="text-muted">Sem permissão para gerar declaração.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleGenerateDeclaracao}>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={declaracaoTurma}
                                                onChange={(e) => setDeclaracaoTurma(e.target.value)}
                                                required
                                            >
                                                <option value="">Selecionar Turma</option>
                                                {turmas.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.nome} - {t.classe_nome || t.classe?.nome || '-'}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Aluno</Form.Label>
                                            <Form.Select
                                                value={declaracaoAluno}
                                                onChange={(e) => setDeclaracaoAluno(e.target.value)}
                                                required
                                                disabled={!declaracaoTurma || loadingStudents}
                                            >
                                                <option value="">{loadingStudents ? 'Carregando...' : 'Selecionar Aluno'}</option>
                                                {students.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.nome_completo || s.nome}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loadingDeclaracao}
                                        >
                                            {loadingDeclaracao ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                                            Gerar Declaração
                                        </Button>
                                    </Col>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {declaracaoData && (
                <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center" style={{ zIndex: 1050 }}>
                    <Card className="shadow-lg border-0 bg-white" style={{ width: '95%', height: '95%' }}>
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                            <div>
                                <h5 className="mb-0 fw-bold">Declaração de Aproveitamento</h5>
                                <small className="text-secondary">
                                    {declaracaoData.aluno?.nome} | {declaracaoData.turma} | {declaracaoData.classe} | Ano: {declaracaoData.ano_letivo}
                                </small>
                            </div>
                            <div className="d-flex gap-2">
                                <Button variant="outline-danger" size="sm" className="d-flex align-items-center gap-2 px-3">
                                    <FaFilePdf /> PDF
                                </Button>
                                <Button variant="outline-secondary" size="sm" onClick={() => setDeclaracaoData(null)}>
                                    Fechar
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0 overflow-auto">
                            <div className="table-responsive">
                                <Table hover className="mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-3">Disciplina</th>
                                            <th className="text-center">MT1</th>
                                            <th className="text-center">MT2</th>
                                            <th className="text-center">MT3</th>
                                            <th className="text-center">MFD</th>
                                            <th className="text-center">Situação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {declaracaoData.disciplinas.map((disc: any) => (
                                            <tr key={disc.disciplina_id}>
                                                <td className="ps-3 fw-medium">{disc.disciplina_nome}</td>
                                                <td className="text-center">{disc.trimestres?.[1] ?? '-'}</td>
                                                <td className="text-center">{disc.trimestres?.[2] ?? '-'}</td>
                                                <td className="text-center">{disc.trimestres?.[3] ?? '-'}</td>
                                                <td className="text-center fw-bold">{disc.mfd ?? '-'}</td>
                                                <td className="text-center">
                                                    <span className={`badge ${disc.situacao === 'Aprovado' ? 'bg-success' : disc.situacao === 'Reprovado' ? 'bg-danger' : 'bg-secondary'}`}>
                                                        {disc.situacao}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                        <Card.Footer className="bg-white border-top d-flex justify-content-end">
                            <span className={`badge ${declaracaoData.situacao_final === 'Aprovado' ? 'bg-success' : declaracaoData.situacao_final === 'Reprovado' ? 'bg-danger' : 'bg-secondary'}`}>
                                Situação Final: {declaracaoData.situacao_final}
                            </span>
                        </Card.Footer>
                    </Card>
                </div>
            )}
        </Container>
    );
};

export default Reports;
