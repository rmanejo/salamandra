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

interface PendingChange {
    studentId: number;
    type: string;
    value: string;
}

const Caderneta: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<Record<number, StudentGrades>>({});
    const [summaries, setSummaries] = useState<Record<number, SummaryData>>({});
    const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());

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

    const handleGradeChange = (studentId: number, type: string, value: string) => {
        const numValue = parseFloat(value);
        if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > 20)) {
            alert("Nota deve ser entre 0 e 20");
            return;
        }

        const key = `${studentId}-${type}`;
        const newPendingChanges = new Map(pendingChanges);

        if (value === '') {
            newPendingChanges.delete(key);
        } else {
            newPendingChanges.set(key, { studentId, type, value });
        }

        setPendingChanges(newPendingChanges);
    };

    const saveAllChanges = async () => {
        if (pendingChanges.size === 0) {
            alert("Não há alterações para guardar");
            return;
        }

        setSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const [, change] of pendingChanges) {
                const { studentId, type, value } = change;
                const numValue = parseFloat(value);

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
                    successCount++;
                } catch (error) {
                    console.error(`Error saving grade for student ${studentId}, type ${type}`, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                alert(`${successCount} nota(s) guardada(s) com sucesso!`);
                setPendingChanges(new Map());
                await loadGradebookData();
            } else {
                alert(`${successCount} nota(s) guardada(s), ${errorCount} erro(s) encontrado(s)`);
            }
        } catch (error) {
            console.error("Error saving grades", error);
            alert("Erro ao guardar notas");
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const td = input.closest('td');
        const tr = td?.closest('tr');

        if (!td || !tr) return;

        let targetCell: HTMLInputElement | null = null;

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                const nextRow = tr.nextElementSibling as HTMLElement;
                if (nextRow) {
                    const cellIndex = Array.from(tr.children).indexOf(td);
                    targetCell = nextRow.children[cellIndex]?.querySelector('input') as HTMLInputElement;
                }
                break;

            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    targetCell = td.previousElementSibling?.querySelector('input') as HTMLInputElement;
                    if (!targetCell) {
                        const prevRow = tr.previousElementSibling as HTMLElement;
                        if (prevRow) {
                            const inputs = prevRow.querySelectorAll('input');
                            targetCell = inputs[inputs.length - 1] as HTMLInputElement;
                        }
                    }
                } else {
                    targetCell = td.nextElementSibling?.querySelector('input') as HTMLInputElement;
                    if (!targetCell) {
                        const nextRow = tr.nextElementSibling as HTMLElement;
                        if (nextRow) {
                            targetCell = nextRow.querySelector('input') as HTMLInputElement;
                        }
                    }
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                const prevRow = tr.previousElementSibling as HTMLElement;
                if (prevRow) {
                    const cellIndex = Array.from(tr.children).indexOf(td);
                    targetCell = prevRow.children[cellIndex]?.querySelector('input') as HTMLInputElement;
                }
                break;

            case 'ArrowDown':
                e.preventDefault();
                const nextRowDown = tr.nextElementSibling as HTMLElement;
                if (nextRowDown) {
                    const cellIndex = Array.from(tr.children).indexOf(td);
                    targetCell = nextRowDown.children[cellIndex]?.querySelector('input') as HTMLInputElement;
                }
                break;

            case 'ArrowLeft':
                if (input.selectionStart === 0) {
                    e.preventDefault();
                    targetCell = td.previousElementSibling?.querySelector('input') as HTMLInputElement;
                }
                break;

            case 'ArrowRight':
                if (input.selectionStart === input.value.length) {
                    e.preventDefault();
                    targetCell = td.nextElementSibling?.querySelector('input') as HTMLInputElement;
                }
                break;
        }

        if (targetCell) {
            targetCell.focus();
            targetCell.select();
        }
    };

    const renderCell = (studentId: number, type: string, readOnly = false) => {
        const key = `${studentId}-${type}`;
        const pendingChange = pendingChanges.get(key);
        const gradeObj = grades[studentId]?.[type];
        const value = pendingChange ? pendingChange.value : (gradeObj ? gradeObj.valor : '');

        if (readOnly) {
            const summary = summaries[studentId];
            let displayVal: string | number = '-';
            if (type === 'MACS') displayVal = summary?.macs ?? '-';
            if (type === 'MT') displayVal = summary?.mt ?? '-';
            if (type === 'COM') displayVal = summary?.com ?? '-';

            return (
                <td className="px-4 py-3 text-center">
                    <div className="bg-blue-100 text-blue-700 font-semibold rounded-md py-1">
                        {displayVal}
                    </div>
                </td>
            );
        }

        const hasPendingChange = pendingChanges.has(key);

        return (
            <td className="px-4 py-3">
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={value}
                    onChange={(e) => handleGradeChange(studentId, type, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={(e) => e.target.select()}
                    className={`
                        w-full text-center rounded-md px-2 py-1
                        border focus:outline-none focus:ring-2 focus:ring-blue-400
                        transition-all
                        ${hasPendingChange
                            ? 'bg-yellow-100 border-yellow-300 font-medium'
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }
                    `}
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
                            setPendingChanges(new Map());
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
                        onChange={(e) => {
                            setSelectedDisciplina(e.target.value);
                            setPendingChanges(new Map());
                        }}
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
                        onChange={(e) => {
                            setSelectedTrimestre(Number(e.target.value));
                            setPendingChanges(new Map());
                        }}
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
                        onChange={(e) => {
                            setSelectedAno(Number(e.target.value));
                            setPendingChanges(new Map());
                        }}
                    />
                </div>
            </div>

            {selectedTurma && selectedDisciplina ? (
                <>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <th className="px-4 py-3 text-center text-sm font-semibold w-12">Nº</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px]">Nome do Aluno</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-16">Sexo</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">ACS1</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">ACS2</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">ACS3</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">MAP</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">MACS</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">ACP</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">MT</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-24">COM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={11} className="text-center py-12 text-gray-500">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                                    Carregando dados...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : students.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="text-center py-12 text-gray-500">
                                                Nenhum aluno encontrado nesta turma.
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((student, index) => (
                                            <tr key={student.id} className={`transition-colors hover:bg-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {student.nome_completo}
                                                </td>
                                                <td className="px-3 py-3 text-center text-sm text-gray-600">
                                                    {student.sexo ? student.sexo[0] : '-'}
                                                </td>

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
                    </div>

                    {/* Botão Guardar */}
                    <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {pendingChanges.size > 0 ? (
                                <>
                                    <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {pendingChanges.size} alteração(ões) pendente(s)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-medium text-gray-700">
                                        Todas as alterações guardadas
                                    </span>
                                </>
                            )}
                        </div>
                        <button
                            onClick={saveAllChanges}
                            disabled={saving || pendingChanges.size === 0}
                            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${saving || pendingChanges.size === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm hover:shadow-md'
                                }`}
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    A Guardar...
                                </span>
                            ) : (
                                'Guardar Alterações'
                            )}
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                    <div className="text-gray-400 mb-2">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-500 font-medium">
                        Selecione uma Turma e Disciplina para visualizar a caderneta
                    </p>
                </div>
            )}
        </div>
    );
};

export default Caderneta;
