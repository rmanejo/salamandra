import React, { useState, useEffect } from 'react';
import { academicService, evaluationService } from '../../services/api';

interface GradeObject {
    valor: number | null;
}

interface SummaryData {
    macs?: number | null;
    mt?: number | null;
    com?: string | null;
}

interface CadernetaRow {
    aluno_id: number;
    numero_turma: number | null;
    nome_completo: string;
    sexo: string | null;
    status: 'ATIVO' | 'DESISTENTE' | 'TRANSFERIDO';
    notas: Record<string, Record<string, number | null>>;
    resumo: Record<string, SummaryData>;
    mfd: number | null;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'DESISTENTE': return 'bg-red-50';
        case 'TRANSFERIDO': return 'bg-green-50';
        default: return '';
    }
};
interface PendingChange {
    studentId: number;
    type: string;
    value: string;
    trimestre: number;
}

const formatDecimal = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '';
    return String(value).replace('.', ',');
};

const parseDecimalInput = (value: string) => {
    const normalized = value.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
};

const Caderneta: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rows, setRows] = useState<CadernetaRow[]>([]);
    const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());

    const [turmas, setTurmas] = useState<any[]>([]);
    const [selectedTurma, setSelectedTurma] = useState<string>('');
    const [selectedDisciplina, setSelectedDisciplina] = useState<string>('');
    const [selectedTrimestre, setSelectedTrimestre] = useState<number>(1);
    const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear());

    // State to determine if the user can actually edit the current selection
    const [canEdit, setCanEdit] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const turmaParam = params.get('turma');
        const disciplinaParam = params.get('disciplina');

        if (turmaParam && turmaParam !== 'undefined') setSelectedTurma(turmaParam);
        if (disciplinaParam && disciplinaParam !== 'undefined') setSelectedDisciplina(disciplinaParam);

        loadInitialData(turmaParam, disciplinaParam);
    }, []);

    useEffect(() => {
        if (selectedTurma && selectedDisciplina) {
            // A user can edit if the selected assignment is in their 'turmas' (minhas atribuicoes) list
            const isTeaching = turmas.some(t =>
                t.id.toString() === selectedTurma &&
                t.disciplinas.some((d: any) => d.id.toString() === selectedDisciplina)
            );
            setCanEdit(isTeaching);
            loadGradebookData();
        }
    }, [selectedTurma, selectedDisciplina, selectedTrimestre, selectedAno, turmas]);

    useEffect(() => {
        if (!selectedTurma) return;
        const turma = turmas.find(t => t.id.toString() === selectedTurma);
        if (turma?.ano_letivo) {
            setSelectedAno(turma.ano_letivo);
        }
    }, [selectedTurma, turmas]);

    const loadInitialData = async (turmaParam?: string | null, disciplinaParam?: string | null) => {
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

            // If we have params but they aren't in assignments (e.g. DD viewing another prof class)
            // we should manually add that entry to the dropdown so it's visible.
            if (turmaParam && disciplinaParam && !turmaMap.has(parseInt(turmaParam))) {
                // We don't have enough data to fill it perfectly here without extra API calls,
                // but we can at least ensure the state works. 
                // Ideally get_turma details and get_disciplina details.
            }

            setTurmas(Array.from(turmaMap.values()));

            if (!turmaParam && turmaMap.size === 1) {
                const onlyTurma = turmaMap.values().next().value;
                setSelectedTurma(onlyTurma.id.toString());
                setSelectedAno(onlyTurma.ano_letivo || new Date().getFullYear());
                if (!disciplinaParam && onlyTurma.disciplinas.length === 1) {
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
            const data = await evaluationService.getCaderneta({
                turma_id: selectedTurma,
                disciplina_id: selectedDisciplina,
                ano_letivo: selectedAno
            });
            setRows(data.rows || []);
        } catch (error) {
            console.error("Error loading gradebook", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (studentId: number, type: string, value: string) => {
        if (!canEdit) return;
        const numValue = parseDecimalInput(value);
        if (value !== '' && (numValue === null || numValue < 0 || numValue > 20)) {
            alert("Nota deve ser entre 0 e 20");
            return;
        }

        const key = `${studentId}-${selectedTrimestre}-${type}`;
        const newPendingChanges = new Map(pendingChanges);

        if (value === '') {
            newPendingChanges.set(key, { studentId, type, value: '', trimestre: selectedTrimestre });
        } else {
            newPendingChanges.set(key, { studentId, type, value, trimestre: selectedTrimestre });
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
                const { studentId, type, value, trimestre } = change;
                const numValue = value === '' ? null : parseDecimalInput(value);
                const payload = {
                    aluno_id: studentId,
                    disciplina_id: Number(selectedDisciplina),
                    turma_id: Number(selectedTurma),
                    trimestre,
                    tipo: type,
                    valor: numValue
                };
                try {
                    await evaluationService.upsertNota(payload);
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

    const renderCell = (studentId: number, type: string, readOnlyResult = false) => {
        const key = `${studentId}-${selectedTrimestre}-${type}`;
        const pendingChange = pendingChanges.get(key);
        const row = rows.find(r => r.aluno_id === studentId);
        const baseValue = row?.notas?.[String(selectedTrimestre)]?.[type];
        const value = pendingChange ? pendingChange.value : (baseValue ?? '');
        const displayValue = typeof value === 'number' ? formatDecimal(value) : value;

        if (readOnlyResult) {
            const summary = row?.resumo?.[String(selectedTrimestre)];
            let displayVal: string | number = '-';
            if (type === 'MACS') displayVal = summary?.macs ?? '-';
            if (type === 'MT') displayVal = summary?.mt ?? '-';
            if (type === 'COM') displayVal = summary?.com ?? '-';
            if (typeof displayVal === 'number') {
                displayVal = formatDecimal(displayVal);
            }

            const mtValue = type === 'MT' ? parseDecimalInput(String(displayVal)) : null;
            const isMtLow = type === 'MT' && mtValue !== null && !Number.isNaN(mtValue) && mtValue < 10;
            const isComNs = type === 'COM' && String(displayVal).toUpperCase() === 'NS';
            const resultClass = (isMtLow || isComNs) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';

            return (
                <td className="px-4 py-3 text-center w-44 border-r border-gray-200">
                    <div className={`${resultClass} font-semibold rounded-md py-1`}>
                        {displayVal}
                    </div>
                </td>
            );
        }

        const hasPendingChange = pendingChanges.has(key);

        return (
            <td className="w-44 border-r border-gray-200 p-0">
                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={displayValue}
                    onChange={(e) => handleGradeChange(studentId, type, e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={(e) => e.target.select()}
                    disabled={!canEdit}
                    className={`
                        w-full h-full text-center px-2 py-1.5 bg-transparent
                        border-0 focus:outline-none focus:ring-2 focus:ring-blue-400
                        transition-all
                        ${!canEdit ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500' :
                            hasPendingChange
                                ? 'bg-yellow-100 font-medium'
                                : 'bg-white'
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Caderneta do Professor</h1>
                {!canEdit && selectedTurma && (
                    <div className="bg-amber-100 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-medium text-sm">Modo de Visualização (Delegado / Coordenação)</span>
                    </div>
                )}
            </div>

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
                        {/* Fallback if param not in teaching list */}
                        {selectedTurma && !turmas.find(t => t.id.toString() === selectedTurma) && (
                            <option value={selectedTurma}>Turma Escolhida</option>
                        )}
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
                        disabled={(!selectedTurma)}
                    >
                        <option value="">Selecione a Disciplina</option>
                        {currentDisciplines.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                        {/* Fallback if param not in list */}
                        {selectedDisciplina && !currentDisciplines.find((d: any) => d.id.toString() === selectedDisciplina) && (
                            <option value={selectedDisciplina}>Disciplina Escolhida</option>
                        )}
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
                        disabled={!canEdit}
                    />
                </div>
            </div>

            {selectedTurma && selectedDisciplina ? (
                <>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-200">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <th className="px-4 py-3 text-center text-sm font-semibold w-12 border-r border-white/30">Nº</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold min-w-[200px] border-r border-white/30">Nome do Aluno</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-16 border-r border-white/30">Sexo</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">ACS1</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">ACS2</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">ACS3</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">MAP</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">MACS</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">ACP</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44 border-r border-white/30">MT</th>
                                        <th className="px-3 py-3 text-center text-sm font-semibold w-44">COM</th>
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
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="text-center py-12 text-gray-500">
                                                Nenhum aluno encontrado nesta turma.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((student, index) => (
                                            <tr key={student.aluno_id} className={`transition-colors ${getStatusColor(student.status)} ${index % 2 === 0 && student.status === 'ATIVO' ? 'bg-white' : student.status === 'ATIVO' ? 'bg-gray-50' : ''} hover:bg-gray-100 border-b border-gray-200`}>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600 border-r border-gray-200">
                                                    {student.numero_turma ?? index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                                                    {student.nome_completo}
                                                    {student.status !== 'ATIVO' && (
                                                        <span className={`ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded border ${student.status === 'DESISTENTE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                                            {student.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center text-sm text-gray-600 border-r border-gray-200">
                                                    {student.sexo ? student.sexo[0] : '-'}
                                                </td>

                                                {renderCell(student.aluno_id, 'ACS1')}
                                                {renderCell(student.aluno_id, 'ACS2')}
                                                {renderCell(student.aluno_id, 'ACS3')}
                                                {renderCell(student.aluno_id, 'MAP')}

                                                {renderCell(student.aluno_id, 'MACS', true)}

                                                {renderCell(student.aluno_id, 'ACP')}

                                                {renderCell(student.aluno_id, 'MT', true)}
                                                {renderCell(student.aluno_id, 'COM', true)}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {canEdit && (
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
                    )}
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
