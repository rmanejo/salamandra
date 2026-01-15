import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Spinner } from 'react-bootstrap';
import { FaFilePdf, FaFileExcel, FaSearch } from 'react-icons/fa';
import { academicRoleService, academicService, reportService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

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
    const [showStats, setShowStats] = useState(false);
    const [autoPautaLoaded, setAutoPautaLoaded] = useState(false);
    const [searchParams] = useSearchParams();
    const [pautaDisciplinaTurma, setPautaDisciplinaTurma] = useState('');
    const [pautaDisciplinaId, setPautaDisciplinaId] = useState('');
    const [pautaDisciplinas, setPautaDisciplinas] = useState<any[]>([]);
    const [loadingPautaDisciplina, setLoadingPautaDisciplina] = useState(false);
    const [cadernetaTurma, setCadernetaTurma] = useState('');
    const [cadernetaDisciplina, setCadernetaDisciplina] = useState('');
    const [cadernetaAno, setCadernetaAno] = useState(new Date().getFullYear().toString());
    const [cadernetaDisciplinas, setCadernetaDisciplinas] = useState<any[]>([]);
    const [loadingCaderneta, setLoadingCaderneta] = useState(false);
    const [listaTurma, setListaTurma] = useState('');
    const [loadingLista, setLoadingLista] = useState(false);
    const [aprovadosTurma, setAprovadosTurma] = useState('');
    const [aprovadosTrimestre, setAprovadosTrimestre] = useState('1');
    const [loadingAprovados, setLoadingAprovados] = useState(false);
    const [situacaoTurma, setSituacaoTurma] = useState('');
    const [situacaoAluno, setSituacaoAluno] = useState('');
    const [situacaoStudents, setSituacaoStudents] = useState<any[]>([]);
    const [loadingSituacao, setLoadingSituacao] = useState(false);
    const [loadingSituacaoStudents, setLoadingSituacaoStudents] = useState(false);

    const reportAdmins = ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO'];
    const isReportAdmin = !!user && reportAdmins.includes(user.role);
    const isProfessorDT = !!user && user.role === 'PROFESSOR' && !!user.academic_roles?.is_dt;
    const isProfessorCC = !!user && user.role === 'PROFESSOR' && !!user.academic_roles?.is_cc;
    const canViewPauta = isReportAdmin || isProfessorDT || isProfessorCC;
    const canViewDeclaracao = isReportAdmin || isProfessorDT;

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };


    const getValor = (aluno: any, coluna: string | number) => {
        if (coluna === 'media') return aluno.media_final ?? null;
        return aluno.disciplinas?.[coluna] ?? null;
    };

    const buildColunaStats = (pauta: any[], coluna: string | number) => {
        const base = {
            avaliados: { total: 0, homens: 0, mulheres: 0 },
            positivos: { total: 0, homens: 0, mulheres: 0 },
            negativos: { total: 0, homens: 0, mulheres: 0 },
            soma: { total: 0, homens: 0, mulheres: 0 },
        };

        const total = { homens: 0, mulheres: 0, geral: pauta.length };
        pauta.forEach((aluno: any) => {
            if (aluno.sexo === 'HOMEM') total.homens += 1;
            else if (aluno.sexo === 'MULHER') total.mulheres += 1;
        });

        pauta.forEach((aluno: any) => {
            const valor = getValor(aluno, coluna);
            if (valor === null || valor === undefined) return;
            base.avaliados.total += 1;
            if (aluno.sexo === 'HOMEM') base.avaliados.homens += 1;
            else if (aluno.sexo === 'MULHER') base.avaliados.mulheres += 1;

            base.soma.total += valor;
            if (aluno.sexo === 'HOMEM') base.soma.homens += valor;
            else if (aluno.sexo === 'MULHER') base.soma.mulheres += valor;

            if (valor >= 10) {
                base.positivos.total += 1;
                if (aluno.sexo === 'HOMEM') base.positivos.homens += 1;
                else if (aluno.sexo === 'MULHER') base.positivos.mulheres += 1;
            } else {
                base.negativos.total += 1;
                if (aluno.sexo === 'HOMEM') base.negativos.homens += 1;
                else if (aluno.sexo === 'MULHER') base.negativos.mulheres += 1;
            }
        });

        const percent = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
        const avg = (sum: number, den: number) => (den > 0 ? sum / den : 0);

        return {
            inscritos: total,
            avaliados: base.avaliados,
            positivos: base.positivos,
            negativos: base.negativos,
            percentPositivos: {
                total: percent(base.positivos.total, base.avaliados.total),
                homens: percent(base.positivos.homens, base.avaliados.homens),
                mulheres: percent(base.positivos.mulheres, base.avaliados.mulheres),
            },
            percentNegativos: {
                total: percent(base.negativos.total, base.avaliados.total),
                homens: percent(base.negativos.homens, base.avaliados.homens),
                mulheres: percent(base.negativos.mulheres, base.avaliados.mulheres),
            },
            soma: base.soma,
            media: {
                total: avg(base.soma.total, base.avaliados.total),
                homens: avg(base.soma.homens, base.avaliados.homens),
                mulheres: avg(base.soma.mulheres, base.avaliados.mulheres),
            },
        };
    };


    const getSituacaoResumo = (pauta: any[]) => {
        const resumo = { Aprovado: 0, Reprovado: 0, Pendente: 0, Transferido: 0, PDF: 0 };
        pauta.forEach((aluno: any) => {
            if (aluno?.situacao === 'Aprovado') resumo.Aprovado += 1;
            else if (aluno?.situacao === 'Reprovado') resumo.Reprovado += 1;
            else if (aluno?.situacao === 'Pendente') resumo.Pendente += 1;
            else if (aluno?.situacao === 'Transferido') resumo.Transferido += 1;
            else if (aluno?.situacao === 'PDF') resumo.PDF += 1;
        });
        return resumo;
    };

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

    const generatePauta = async (turmaId: number, trimestre: number) => {
        setLoading(true);
        try {
            setDeclaracaoData(null);
            const data = await reportService.getClassReportGeneral({
                turma_id: turmaId,
                trimestre,
            });
            setPautaData(data);
        } catch (error) {
            console.error('Error generating pauta:', error);
            alert('Erro ao gerar pauta. Verifique se os dados estão corretos.');
        } finally {
            setLoading(false);
        }
    };

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

    useEffect(() => {
        const loadSituacaoStudents = async () => {
            if (!situacaoTurma) {
                setSituacaoStudents([]);
                setSituacaoAluno('');
                return;
            }
            setLoadingSituacaoStudents(true);
            try {
                const studentsRes = await academicService.getStudents({ turma_id: situacaoTurma });
                const list = Array.isArray(studentsRes) ? studentsRes : studentsRes.results || [];
                setSituacaoStudents(list);
            } catch (error) {
                console.error('Error fetching students for situacao:', error);
                setSituacaoStudents([]);
            } finally {
                setLoadingSituacaoStudents(false);
            }
        };
        loadSituacaoStudents();
    }, [situacaoTurma]);

    useEffect(() => {
        const loadPautaDisciplinas = async () => {
            if (!pautaDisciplinaTurma) {
                setPautaDisciplinas([]);
                setPautaDisciplinaId('');
                return;
            }
            try {
                const data = await academicService.getTurmaDisciplinas(Number(pautaDisciplinaTurma));
                setPautaDisciplinas(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching disciplinas for pauta:', error);
                setPautaDisciplinas([]);
            }
        };
        loadPautaDisciplinas();
    }, [pautaDisciplinaTurma]);

    useEffect(() => {
        const loadCadernetaDisciplinas = async () => {
            if (!cadernetaTurma) {
                setCadernetaDisciplinas([]);
                setCadernetaDisciplina('');
                return;
            }
            try {
                const data = await academicService.getTurmaDisciplinas(Number(cadernetaTurma));
                setCadernetaDisciplinas(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching disciplinas for caderneta:', error);
                setCadernetaDisciplinas([]);
            }
        };
        loadCadernetaDisciplinas();
    }, [cadernetaTurma]);

    const handleGeneratePauta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTurma) return;
        await generatePauta(parseInt(selectedTurma), parseInt(selectedTrimestre));
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

    const handleDownloadPautaGeralXlsx = async () => {
        if (!selectedTurma) return;
        try {
            const blob = await reportService.getClassReportGeneralXlsx({
                turma_id: parseInt(selectedTurma),
                trimestre: parseInt(selectedTrimestre),
            });
            downloadBlob(blob, 'pauta_turma_geral.xlsx');
        } catch (error) {
            console.error('Error downloading pauta geral:', error);
            alert('Erro ao baixar Excel da pauta.');
        }
    };

    const handleDownloadDeclaracaoXlsx = async () => {
        if (!declaracaoAluno) return;
        try {
            const blob = await reportService.getStudentDeclarationXlsx({
                aluno_id: parseInt(declaracaoAluno),
            });
            downloadBlob(blob, 'declaracao_aluno.xlsx');
        } catch (error) {
            console.error('Error downloading declaracao:', error);
            alert('Erro ao baixar Excel da declaração.');
        }
    };

    const handleDownloadPautaDisciplinaXlsx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pautaDisciplinaTurma || !pautaDisciplinaId) return;
        setLoadingPautaDisciplina(true);
        try {
            const blob = await reportService.getClassReportXlsx({
                turma_id: parseInt(pautaDisciplinaTurma),
                disciplina_id: parseInt(pautaDisciplinaId),
            });
            downloadBlob(blob, 'pauta_turma_disciplina.xlsx');
        } catch (error) {
            console.error('Error downloading pauta disciplina:', error);
            alert('Erro ao baixar Excel da pauta por disciplina.');
        } finally {
            setLoadingPautaDisciplina(false);
        }
    };

    const handleDownloadCadernetaXlsx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cadernetaTurma || !cadernetaDisciplina || !cadernetaAno) return;
        setLoadingCaderneta(true);
        try {
            const blob = await reportService.getCadernetaXlsx({
                turma_id: parseInt(cadernetaTurma),
                disciplina_id: parseInt(cadernetaDisciplina),
                ano_letivo: parseInt(cadernetaAno),
            });
            downloadBlob(blob, 'caderneta.xlsx');
        } catch (error) {
            console.error('Error downloading caderneta:', error);
            alert('Erro ao baixar Excel da caderneta.');
        } finally {
            setLoadingCaderneta(false);
        }
    };

    const handleDownloadListaXlsx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!listaTurma) return;
        setLoadingLista(true);
        try {
            const blob = await reportService.getStudentsListXlsx({
                turma_id: parseInt(listaTurma),
            });
            downloadBlob(blob, 'lista_alunos_turma.xlsx');
        } catch (error) {
            console.error('Error downloading lista alunos:', error);
            alert('Erro ao baixar Excel da lista de alunos.');
        } finally {
            setLoadingLista(false);
        }
    };

    const handleDownloadAprovadosXlsx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aprovadosTurma) return;
        setLoadingAprovados(true);
        try {
            const blob = await reportService.getAprovadosReprovadosXlsx({
                turma_id: parseInt(aprovadosTurma),
                trimestre: parseInt(aprovadosTrimestre),
            });
            downloadBlob(blob, 'aprovados_reprovados_turma.xlsx');
        } catch (error) {
            console.error('Error downloading aprovados/reprovados:', error);
            alert('Erro ao baixar Excel de aprovados/reprovados.');
        } finally {
            setLoadingAprovados(false);
        }
    };

    const handleDownloadSituacaoXlsx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!situacaoAluno) return;
        setLoadingSituacao(true);
        try {
            const blob = await reportService.getStudentSituationXlsx({
                aluno_id: parseInt(situacaoAluno),
            });
            downloadBlob(blob, 'situacao_academica.xlsx');
        } catch (error) {
            console.error('Error downloading situacao:', error);
            alert('Erro ao baixar Excel da situação acadêmica.');
        } finally {
            setLoadingSituacao(false);
        }
    };

    useEffect(() => {
        if (fetchingBase || autoPautaLoaded || !canViewPauta) return;
        const turmaIdParam = searchParams.get('turma_id');
        const trimestreParam = searchParams.get('trimestre');
        if (!turmaIdParam) return;
        const turmaId = parseInt(turmaIdParam);
        const trimestre = trimestreParam ? parseInt(trimestreParam) : parseInt(selectedTrimestre);
        if (!Number.isFinite(turmaId) || !Number.isFinite(trimestre)) return;
        setSelectedTurma(turmaIdParam);
        setSelectedTrimestre(String(trimestre));
        setAutoPautaLoaded(true);
        generatePauta(turmaId, trimestre);
    }, [autoPautaLoaded, canViewPauta, fetchingBase, searchParams, selectedTrimestre]);

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
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="d-flex align-items-center gap-2 px-3"
                                    onClick={() => setShowStats((prev) => !prev)}
                                >
                                    Estatística
                                </Button>
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    className="d-flex align-items-center gap-2 px-3"
                                    onClick={handleDownloadPautaGeralXlsx}
                                >
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
                                            <th className="text-center">Sexo</th>
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
                                                <td className="text-center">{aluno.sexo === 'HOMEM' ? 'H' : aluno.sexo === 'MULHER' ? 'M' : '-'}</td>
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
                            <div className="d-flex flex-wrap gap-3 p-3 border-top bg-white">
                                {(() => {
                                    const resumo = getSituacaoResumo(pautaData.pauta || []);
                                    return (
                                        <>
                                            <span className="badge bg-success">Aprovados: {resumo.Aprovado}</span>
                                            <span className="badge bg-danger">Reprovados: {resumo.Reprovado}</span>
                                            <span className="badge bg-warning text-dark">Pendentes: {resumo.Pendente}</span>
                                            <span className="badge bg-secondary">Transferidos: {resumo.Transferido}</span>
                                            <span className="badge bg-dark">PDF: {resumo.PDF}</span>
                                        </>
                                    );
                                })()}
                            </div>
                            {showStats && (
                                <div className="p-3 border-top bg-white">
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white d-flex align-items-center justify-content-between">
                                            <strong>Estatística da Pauta</strong>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => setShowStats(false)}
                                            >
                                                Fechar
                                            </Button>
                                        </Card.Header>
                                        <Card.Body className="p-0">
                                            <div className="table-responsive">
                                                <Table className="mb-0 align-middle">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th className="ps-3">Características</th>
                                                            <th className="text-center">Sexo</th>
                                                            {pautaData.disciplinas.map((disc: any) => (
                                                                <th key={disc.id} className="text-center">{disc.nome}</th>
                                                            ))}
                                                            <th className="text-center">Média</th>
                                                            <th />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const colStats = pautaData.disciplinas.map((disc: any) => ({
                                                                id: disc.id,
                                                                stats: buildColunaStats(pautaData.pauta || [], disc.id),
                                                            }));
                                                            const mediaStats = buildColunaStats(pautaData.pauta || [], 'media');
                                                            const fmtCount = (v: number) => `${Math.round(v)}`;
                                                            const fmtValue = (v: number) => `${v.toFixed(1)}`;
                                                            const fmtPercent = (v: number) => `${v.toFixed(1)}%`;

                                                            const renderBlock = (
                                                                label: string,
                                                                accessor: (s: any) => any,
                                                                formatter: (v: number) => string
                                                            ) => {
                                                                const buildRow = (sexoLabel: string) => (
                                                                    <tr key={`${label}-${sexoLabel}`}>
                                                                        {sexoLabel === 'M' && (
                                                                            <td className="ps-3 fw-bold align-middle" rowSpan={3}>
                                                                                {label}
                                                                            </td>
                                                                        )}
                                                                        <td className="text-center fw-bold">{sexoLabel}</td>
                                                                        {colStats.map((col) => {
                                                                            const stats = accessor(col.stats);
                                                                            const value = sexoLabel === 'M'
                                                                                ? stats.mulheres
                                                                                : sexoLabel === 'H'
                                                                                    ? stats.homens
                                                                                    : stats.total;
                                                                            return (
                                                                                <td key={`${col.id}-${sexoLabel}`} className="text-center">
                                                                                    {formatter(value)}
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        {(() => {
                                                                            const stats = accessor(mediaStats);
                                                                            const value = sexoLabel === 'M'
                                                                                ? stats.mulheres
                                                                                : sexoLabel === 'H'
                                                                                    ? stats.homens
                                                                                    : stats.total;
                                                                            return (
                                                                                <td className="text-center">
                                                                                    {formatter(value)}
                                                                                </td>
                                                                            );
                                                                        })()}
                                                                        <td />
                                                                    </tr>
                                                                );

                                                                return (
                                                                    <>
                                                                        {buildRow('M')}
                                                                        {buildRow('H')}
                                                                        {buildRow('HM')}
                                                                    </>
                                                                );
                                                            };
                                                            return (
                                                                <>
                                                                    {renderBlock('Alunos Avaliados', (s) => s.avaliados, fmtCount)}
                                                                    {renderBlock('Em situação Positiva', (s) => s.positivos, fmtCount)}
                                                                    {renderBlock('Percentagem de Positivas', (s) => s.percentPositivos, fmtPercent)}
                                                                    {renderBlock('Em situação Negativa', (s) => s.negativos, fmtCount)}
                                                                    {renderBlock('Percentagem de Negativas', (s) => s.percentNegativos, fmtPercent)}
                                                                    {renderBlock('Soma das Notas', (s) => s.soma, fmtValue)}
                                                                    {renderBlock('Nota Média', (s) => s.media, fmtValue)}
                                                                </>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </div>
                            )}
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

            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Pauta por Disciplina (Excel)</h6>
                            {!canViewPauta ? (
                                <div className="text-muted">Sem permissão para gerar pauta.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleDownloadPautaDisciplinaXlsx}>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={pautaDisciplinaTurma}
                                                onChange={(e) => setPautaDisciplinaTurma(e.target.value)}
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
                                            <Form.Label className="small fw-bold">Disciplina</Form.Label>
                                            <Form.Select
                                                value={pautaDisciplinaId}
                                                onChange={(e) => setPautaDisciplinaId(e.target.value)}
                                                required
                                                disabled={!pautaDisciplinaTurma}
                                            >
                                                <option value="">Selecionar Disciplina</option>
                                                {pautaDisciplinas.map((d: any) => (
                                                    <option key={d.id} value={d.id}>{d.nome}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
                                        <Button
                                            type="submit"
                                            variant="success"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loadingPautaDisciplina}
                                        >
                                            {loadingPautaDisciplina ? <Spinner animation="border" size="sm" /> : <FaFileExcel />}
                                            Baixar Excel
                                        </Button>
                                    </Col>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Caderneta por Disciplina (Excel)</h6>
                            {!canViewPauta ? (
                                <div className="text-muted">Sem permissão para gerar caderneta.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleDownloadCadernetaXlsx}>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={cadernetaTurma}
                                                onChange={(e) => setCadernetaTurma(e.target.value)}
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
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Disciplina</Form.Label>
                                            <Form.Select
                                                value={cadernetaDisciplina}
                                                onChange={(e) => setCadernetaDisciplina(e.target.value)}
                                                required
                                                disabled={!cadernetaTurma}
                                            >
                                                <option value="">Selecionar Disciplina</option>
                                                {cadernetaDisciplinas.map((d: any) => (
                                                    <option key={d.id} value={d.id}>{d.nome}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Ano Letivo</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={cadernetaAno}
                                                onChange={(e) => setCadernetaAno(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2} className="d-flex align-items-end">
                                        <Button
                                            type="submit"
                                            variant="success"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loadingCaderneta}
                                        >
                                            {loadingCaderneta ? <Spinner animation="border" size="sm" /> : <FaFileExcel />}
                                            Baixar
                                        </Button>
                                    </Col>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Lista de Alunos por Turma (Excel)</h6>
                            {!canViewPauta ? (
                                <div className="text-muted">Sem permissão para gerar lista.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleDownloadListaXlsx}>
                                    <Col md={9}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={listaTurma}
                                                onChange={(e) => setListaTurma(e.target.value)}
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
                                    <Col md={3} className="d-flex align-items-end">
                                        <Button
                                            type="submit"
                                            variant="success"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loadingLista}
                                        >
                                            {loadingLista ? <Spinner animation="border" size="sm" /> : <FaFileExcel />}
                                            Baixar
                                        </Button>
                                    </Col>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Aprovados e Reprovados (Excel)</h6>
                            {!canViewPauta ? (
                                <div className="text-muted">Sem permissão para gerar relatório.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleDownloadAprovadosXlsx}>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={aprovadosTurma}
                                                onChange={(e) => setAprovadosTurma(e.target.value)}
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
                                                value={aprovadosTrimestre}
                                                onChange={(e) => setAprovadosTrimestre(e.target.value)}
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
                                            variant="success"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loadingAprovados}
                                        >
                                            {loadingAprovados ? <Spinner animation="border" size="sm" /> : <FaFileExcel />}
                                            Baixar
                                        </Button>
                                    </Col>
                                </Form>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0 bg-white">
                        <Card.Body className="p-4">
                            <h6 className="mb-3 text-muted text-uppercase fw-bold small">Situação Acadêmica do Aluno (Excel)</h6>
                            {!canViewDeclaracao ? (
                                <div className="text-muted">Sem permissão para gerar situação acadêmica.</div>
                            ) : (
                                <Form className="row g-3" onSubmit={handleDownloadSituacaoXlsx}>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="small fw-bold">Turma</Form.Label>
                                            <Form.Select
                                                value={situacaoTurma}
                                                onChange={(e) => setSituacaoTurma(e.target.value)}
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
                                                value={situacaoAluno}
                                                onChange={(e) => setSituacaoAluno(e.target.value)}
                                                required
                                                disabled={!situacaoTurma || loadingSituacaoStudents}
                                            >
                                                <option value="">{loadingSituacaoStudents ? 'Carregando...' : 'Selecionar Aluno'}</option>
                                                {situacaoStudents.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.nome_completo || s.nome}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
                                        <Button
                                            type="submit"
                                            variant="success"
                                            className="w-100 d-flex align-items-center justify-content-center gap-2 fw-bold"
                                            disabled={loadingSituacao}
                                        >
                                            {loadingSituacao ? <Spinner animation="border" size="sm" /> : <FaFileExcel />}
                                            Baixar
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
                                <Button
                                    variant="outline-success"
                                    size="sm"
                                    className="d-flex align-items-center gap-2 px-3"
                                    onClick={handleDownloadDeclaracaoXlsx}
                                >
                                    <FaFileExcel /> Excel
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
