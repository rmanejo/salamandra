import React, { useState, useEffect } from 'react';
import { academicService, evaluationService } from '../../services/api';

interface Student {
    id: number;
    nome_completo: string;
    sexo: string;
}

interface GradeObject {
    id: number;
    valor: number;
    tipo: string;
}

interface StudentGrades {
    [key: string]: GradeObject | undefined;
}

interface SummaryData {
    macs?: number | null;
    mt?: number | null;
    com?: string | null;
}

const Caderneta: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<Record<number, StudentGrades>>({});
    const [summaries, setSummaries] = useState<Record<number, SummaryData>>({});

    const [turmas, setTurmas] = useState<any[]>([]);
    const [selectedTurma, setSelectedTurma] = useState<string>('');
    const [selectedDisciplina, setSelectedDisciplina] = useState<string>('');
    const [selectedTrimestre, setSelectedTrimestre] = useState<number>(1);
    const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedTurma && selectedDisciplina) {
            loadGradebookData();
        }
    }, [selectedTurma, selectedDisciplina, selectedTrimestre, selectedAno]);

    const loadInitialData = async () => {
        try {
            const assignments = await academicService.getMinhasAtribuicoes();
            const turmaMap = new Map();

            assignments.forEach((a: any) => {
                if (!turmaMap.has(a.turma_id)) {
                    turmaMap.set(a.turma_id, {
                        id: a.turma_id,
                        nome: a.turma_nome,
                        ano_letivo: a.ano_letivo,
                        disciplinas: []
                    });
                }
                turmaMap.get(a.turma_id).disciplinas.push({
                    id: a.disciplina_id,
                    nome: a.disciplina_nome
                });
            });

            setTurmas(Array.from(turmaMap.values()));

            if (turmaMap.size === 1) {
                const onlyTurma = turmaMap.values().next().value;
                setSelectedTurma(onlyTurma.id.toString());
                if (onlyTurma.disciplinas.length === 1) {
                    setSelectedDisciplina(onlyTurma.disciplinas[0].id.toString());
                }
            }
        } catch (error) {
            console.error("Error loading initial data", error);
            setTurmas([]);
        }
    };

    const loadGradebookData = async () => {
        setLoading(true);
        try {
            const studentsData = await academicService.getStudents({ turma_id: selectedTurma });
            const studentList = studentsData.results || studentsData;
            setStudents(studentList);

            const gradesData = await evaluationService.getGrades({
                turma_id: selectedTurma,
                disciplina_id: selectedDisciplina,
                trimestre: selectedTrimestre
            });

            const newGrades: Record<number, StudentGrades> = {};
            const gradesList = Array.isArray(gradesData) ? gradesData : gradesData.results || [];

            gradesList.forEach((nota: any) => {
                if (!newGrades[nota.aluno]) newGrades[nota.aluno] = {};
                newGrades[nota.aluno][nota.tipo] = {
                    id: nota.id,
                    valor: parseFloat(nota.valor),
                    tipo: nota.tipo
                };
            });
            setGrades(newGrades);

            const summariesData = await evaluationService.getResumoTrimestral({
                turma: selectedTurma,
                disciplina: selectedDisciplina,
                trimestre: selectedTrimestre
            });

            const newSummaries: Record<number, SummaryData> = {};
            const summaryList = Array.isArray(summariesData) ? summariesData : summariesData.results || [];

            summaryList.forEach((sum: any) => {
                newSummaries[sum.aluno] = {
                    macs: sum.macs,
                    mt: sum.mt,
                    com: sum.com
                };
            });
            setSummaries(newSummaries);

        } catch (error) {
            console.error("Error loading gradebook", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = async (studentId: number, type: string, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) && value !== '') return;
        if (numValue < 0 || numValue > 20) {
            alert("Nota deve ser entre 0 e 20");
            return;
        }

        const existingNote = grades[studentId]?.[type];
        const payload = {
            aluno: studentId,
            disciplina: selectedDisciplina,
            turma: selectedTurma,
            trimestre: selectedTrimestre,
            tipo: type,
            valor: numValue
        };

        try {
            if (existingNote && existingNote.id) {
                await evaluationService.updateNota(existingNote.id, payload);
            } else {
                await evaluationService.postGrade(payload);
            }
            await loadGradebookData();
        } catch (error) {
            console.error("Error saving grade", error);
            alert("Erro ao salvar nota");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const td = input.closest('td');
        const tr = td?.closest('tr');

        if (!td || !tr) return;

        let targetCell: HTMLElement | null = null;

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                const nextRow = tr.nextElementSibling as HTMLElement;
                if (nextRow) {
                    const cellIndex = Array.from(tr.children).indexOf(td);
                    targetCell = nextRow.children[cellIndex]?.querySelector('input') as HTMLElement;
                }
                break;

            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    targetCell = td.previousElementSibling?.querySelector('input') as HTMLElement;
                    if (!targetCell) {
                        const prevRow = tr.previousElementSibling as HTMLElement;
                        if (prevRow) {
                            const inputs = prevRow.querySelectorAll('input');
                            targetCell = inputs[inputs.length - 1] as HTMLElement;
                        }
                    }
                } else {
                    targetCell = td.nextElementSibling?.querySelector('input') as HTMLElement;
                    if (!targetCell) {
                        const nextRow = tr.nextElementSibling as HTMLElement;
                        if (nextRow) {
                            targetCell = nextRow.querySelector('input') as HTMLElement;
                        }
                    }
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevRow = tr.previousElementSibling as HTMLElement;
                if (prevRow) {
                    const cellIndex = Array.from(tr.children).indexOf(td);
                    targetCell = prevRow.children[cellIndex]?.querySelector('input') as HTMLElement;
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                const nextRowDown = tr.nextElementSibling as HTMLElement;
                if (nextRowDown) {
                    const cellIndex = Array.from(tr.children).indexOf(td);
                    targetCell = nextRowDown.children[cellIndex]?.querySelector('input') as HTMLElement;
                }
                break;

            case 'ArrowLeft':
                if (input.selectionStart === 0) {
                    e.preventDefault();
                    targetCell = td.previousElementSibling?.querySelector('input') as HTMLElement;
                }
                break;

            case 'ArrowRight':
                if (input.selectionStart === input.value.length) {
                    e.preventDefault();
                    targetCell = td.nextElementSibling?.querySelector('input') as HTMLElement;
                }
                break;
        }

        if (targetCell) {
            targetCell.focus();
            targetCell.select();
        }
    };

    const renderCell = (studentId: number, type: string, readOnly = false) => {
        const gradeObj = grades[studentId]?.[type];
        const value = gradeObj ? gradeObj.valor : '';

        if (readOnly) {
            const summary = summaries[studentId];
            let displayVal: string | number = '-';
            if (type === 'MACS') displayVal = summary?.macs ?? '-';
            if (type === 'MT') displayVal = summary?.mt ?? '-';
            if (type === 'COM') displayVal = summary?.com ?? '-';

            return <td className="p-2 border bg-gray-50 text-center">{displayVal}</td>;
        }

        return (
            <td className="p-2 border">
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className="w-16 p-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    defaultValue={value}
                    onKeyDown={handleKeyDown}
                    onBlur={(e) => {
                        const currentVal = value?.toString() || '';
                        if (e.target.value !== currentVal) {
                            handleGradeChange(studentId, type, e.target.value);
                        }
                    }}
                    onFocus={(e) => e.target.select()}
                />
            </td>
        );
    };

    const currentDisciplines = selectedTurma
        ? turmas.find(t => t.id.toString() === selectedTurma)?.disciplinas || []
        : [];

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Caderneta do Professor</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white p-4 rounded shadow">
                <div>
                    <label className="block text-sm font-medium mb-1">Turma</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedTurma}
                        onChange={(e) => {
                            setSelectedTurma(e.target.value);
                            setSelectedDisciplina('');
                        }}
                    >
                        <option value="">Selecione a Turma</option>
                        {turmas.map(t => (
                            <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Disciplina</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedDisciplina}
                        onChange={(e) => setSelectedDisciplina(e.target.value)}
                        disabled={!selectedTurma}
                    >
                        <option value="">Selecione a Disciplina</option>
                        {currentDisciplines.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Trimestre</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectedTrimestre}
                        onChange={(e) => setSelectedTrimestre(Number(e.target.value))}
                    >
                        <option value={1}>1º Trimestre</option>
                        <option value={2}>2º Trimestre</option>
                        <option value={3}>3º Trimestre</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Ano Lectivo</label>
                    <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={selectedAno}
                        onChange={(e) => setSelectedAno(Number(e.target.value))}
                    />
                </div>
            </div>

            {selectedTurma && selectedDisciplina ? (
                <div className="bg-white rounded shadow overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 border">#</th>
                                <th className="px-4 py-3 border w-64">Nome do Aluno</th>
                                <th className="px-4 py-3 border text-center">Sexo</th>
                                <th className="px-2 py-3 border text-center w-16">ACS1</th>
                                <th className="px-2 py-3 border text-center w-16">ACS2</th>
                                <th className="px-2 py-3 border text-center w-16">ACS3</th>
                                <th className="px-2 py-3 border text-center w-16">MAP</th>
                                <th className="px-2 py-3 border text-center w-16 bg-gray-200">MACS</th>
                                <th className="px-2 py-3 border text-center w-16">ACP</th>
                                <th className="px-2 py-3 border text-center w-16 bg-gray-200">MT</th>
                                <th className="px-2 py-3 border text-center w-16 bg-gray-200">COM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-8">Carregando dados...</td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-8">Nenhum aluno encontrado nesta turma.</td>
                                </tr>
                            ) : (
                                students.map((student, index) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 border">{index + 1}</td>
                                        <td className="px-4 py-2 border font-medium">{student.nome_completo}</td>
                                        <td className="px-4 py-2 border text-center">{student.sexo ? student.sexo[0] : '-'}</td>

                                        {renderCell(student.id, 'ACS1')}
                                        {renderCell(student.id, 'ACS2')}
                                        {renderCell(student.id, 'ACS3')}
                                        {renderCell(student.id, 'MAP')}

                                        {renderCell(student.id, 'MACS', true)}

                                        {renderCell(student.id, 'ACP')}

                                        {renderCell(student.id, 'MT', true)}
                                        {renderCell(student.id, 'COM', true)}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded shadow text-gray-500">
                    Selecione uma Turma e Disciplina para visualizar a caderneta.
                </div>
            )}
        </div>
    );
};

export default Caderneta;
