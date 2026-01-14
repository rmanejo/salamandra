import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for session-based auth
});

// Store CSRF token
let csrfToken: string | null = null;

// Function to get CSRF token
const getCsrfToken = async (): Promise<string | null> => {
    // Return cached token if available
    if (csrfToken) {
        return csrfToken;
    }

    try {
        const response = await api.get('/accounts/csrf-token/');
        csrfToken = response.data.csrfToken;
        return csrfToken;
    } catch (error) {
        // If endpoint doesn't exist, try to get from cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                csrfToken = value;
                return csrfToken;
            }
        }
        return null;
    }
};

// Add CSRF token to requests
api.interceptors.request.use(
    async (config) => {
        // Only add CSRF token for POST, PUT, PATCH, DELETE requests
        if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
            const token = await getCsrfToken();
            if (token) {
                // Django accepts both X-CSRFToken and X-CSRF-Token
                config.headers['X-CSRFToken'] = token;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Update CSRF token after successful requests
api.interceptors.response.use(
    (response) => {
        // Update token from response headers if available
        const newToken = response.headers['x-csrftoken'] || response.headers['X-CSRFToken'];
        if (newToken) {
            csrfToken = newToken;
        }
        return response;
    },
    (error) => {
        // Clear token on 403 to force refresh
        if (error.response?.status === 403) {
            csrfToken = null;
        }
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (credentials: any) => {
        const response = await api.post('/accounts/login/', credentials);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data;
    },
    getCurrentUser: async () => {
        const response = await api.get('/accounts/me/');
        return response.data;
    },
    changePassword: async (payload: { old_password: string; new_password: string; confirm_password: string }) => {
        const response = await api.post('/accounts/change_password/', payload);
        return response.data;
    },
    logout: async () => {
        try {
            await api.post('/accounts/logout/');
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('token');
            csrfToken = null;
        }
    },
    verifyPassword: async (password: string) => {
        const response = await api.post('/accounts/verify-password/', { password });
        return response.data;
    },
};

export const institutionalService = {
    getDirectorDashboard: async () => {
        const response = await api.get('/instituicoes/director/dashboard/');
        return response.data;
    },
    toggleSchoolLock: async (lock?: boolean) => {
        const payload = lock !== undefined ? { bloquear: lock } : {};
        const response = await api.post('/instituicoes/director/bloquear_escola/', payload);
        return response.data;
    },
    getSchools: async (params?: any) => {
        const response = await api.get('/instituicoes/escolas/', { params });
        return response.data;
    },
    setupSchool: async (schoolData: any) => {
        const response = await api.post('/instituicoes/escolas/', schoolData);
        return response.data;
    },
};

export const daeService = {
    getStatsAlunos: async () => {
        const response = await api.get('/academico/dae/estatisticas_alunos/');
        return response.data;
    },
    getStatsDisciplinas: async () => {
        const response = await api.get('/academico/dae/estatisticas_disciplinas/');
        return response.data;
    },
    getStatsAproveitamento: async () => {
        const response = await api.get('/academico/dae/estatisticas_aproveitamento/');
        return response.data;
    },
    atribuirCargo: async (data: any) => {
        const response = await api.post('/academico/dae/atribuir_cargo/', data);
        return response.data;
    },
};

export const administrativeService = {
    getStaffMembers: async () => {
        const response = await api.get('/administrativo/funcionarios/');
        return response.data;
    },
    registerStaff: async (data: any) => {
        const response = await api.post('/administrativo/funcionarios/registar/', data);
        return response.data;
    },
    deleteStaff: async (id: number) => {
        const response = await api.delete(`/administrativo/funcionarios/${id}/`);
        return response.data;
    },
    updateStaff: async (id: number, data: any) => {
        const response = await api.put(`/administrativo/funcionarios/${id}/`, data);
        return response.data;
    },
    getDisciplinas: async () => {
        const response = await api.get('/instituicoes/director/get_disciplinas/');
        return response.data;
    },
    getEvaluations: async (params?: any) => {
        const response = await api.get('/administrativo/avaliacoes-desempenho/', { params });
        return response.data;
    },
    createEvaluation: async (data: any) => {
        const response = await api.post('/administrativo/avaliacoes-desempenho/', data);
        return response.data;
    }
};

export const academicService = {
    getStudents: async (params?: any) => {
        const response = await api.get('/academico/alunos/', { params });
        return response.data;
    },
    enrollStudent: async (studentData: any) => {
        const response = await api.post('/academico/alunos/', studentData);
        return response.data;
    },
    updateStudent: async (id: number, studentData: any) => {
        const response = await api.patch(`/academico/alunos/${id}/`, studentData);
        return response.data;
    },
    deleteStudent: async (id: number) => {
        const response = await api.delete(`/academico/alunos/${id}/`);
        return response.data;
    },
    moveStudent: async (id: number, nova_turma_id: number) => {
        const response = await api.post(`/academico/alunos/${id}/mover_turma/`, { nova_turma_id });
        return response.data;
    },
    transferStudent: async (id: number, transferData: { escola_destino: string; motivo?: string }) => {
        const response = await api.post(`/academico/alunos/${id}/transferir/`, transferData);
        return response.data;
    },
    getAcademicStatus: async (id: number) => {
        const response = await api.get(`/academico/alunos/${id}/situacao_academica/`);
        return response.data;
    },
    getTurmas: async (params?: any) => {
        const response = await api.get('/academico/turmas/', { params });
        return response.data;
    },
    getDisciplinas: async (params?: any) => {
        const response = await api.get('/academico/disciplinas/', { params });
        return response.data;
    },
    seedPrimaria: async () => {
        const response = await api.post('/academico/disciplinas/seed_primaria/');
        return response.data;
    },
    seedSecundaria: async () => {
        const response = await api.post('/academico/disciplinas/seed_secundaria/');
        return response.data;
    },
    getClasses: async () => {
        const response = await api.get('/academico/classes/');
        return response.data;
    },
    formarTurmas: async (data: { classe_id: number; ano_letivo: number; min_alunos?: number; max_alunos?: number; naming_convention?: string }) => {
        const response = await api.post('/academico/turmas/formar_turmas/', data);
        return response.data;
    },
    // Professores
    getTeachers: async (params?: any) => {
        const response = await api.get('/academico/professores/', { params });
        return response.data;
    },
    updateTeacher: async (id: number, teacherData: any) => {
        const response = await api.patch(`/academico/professores/${id}/`, teacherData);
        return response.data;
    },
    setupAcademico: async () => {
        const response = await api.post('/academico/classes/setup_academico/');
        return response.data;
    },
    getTurmaDisciplinas: async (turmaId: number) => {
        const response = await api.get(`/academico/turmas/${turmaId}/disciplinas/`);
        return response.data;
    },
    getTurmaDisciplinasAtribuidas: async (turmaId: number) => {
        const response = await api.get(`/academico/turmas/${turmaId}/disciplinas_atribuidas/`);
        return response.data;
    },
    atribuirProfessor: async (turmaId: number, data: { disciplina_id: number; professor_id: number | null }) => {
        const response = await api.post(`/academico/turmas/${turmaId}/atribuir_professor/`, data);
        return response.data;
    },
    getTeacherAssignments: async (teacherId: number) => {
        const response = await api.get(`/academico/professores/${teacherId}/atribuicoes/`);
        return response.data;
    },
    getMinhasAtribuicoes: async () => {
        const response = await api.get('/academico/professores/minhas_atribuicoes/');
        return response.data;
    },
    updateTurma: async (id: number, data: any) => {
        const response = await api.patch(`/academico/turmas/${id}/`, data);
        return response.data;
    },
    deleteTurma: async (id: number) => {
        const response = await api.delete(`/academico/turmas/${id}/`);
        return response.data;
    },
    atribuirCargo: (data: { professor_id: number | null; cargo_tipo: string; entidade_id: number; ano_letivo: number }) => api.post('/academico/dae/atribuir_cargo/', data),
};

export const evaluationService = {
    postGrade: async (gradeData: any) => {
        const response = await api.post('/avaliacoes/notas/', gradeData);
        return response.data;
    },
    getGrades: async (params?: any) => {
        const response = await api.get('/avaliacoes/notas/', { params });
        return response.data;
    },
    updateNota: async (id: number, gradeData: any) => {
        const response = await api.patch(`/avaliacoes/notas/${id}/`, gradeData);
        return response.data;
    },
    deleteNota: async (id: number) => {
        const response = await api.delete(`/avaliacoes/notas/${id}/`);
        return response.data;
    },
    getResumoTrimestral: async (params?: any) => {
        const response = await api.get('/avaliacoes/resumos/', { params });
        return response.data;
    },
    upsertNota: async (payload: {
        aluno_id: number;
        turma_id: number;
        disciplina_id: number;
        trimestre: number;
        tipo: string;
        valor: number | null;
    }) => {
        const response = await api.put('/avaliacoes/notas/upsert/', payload);
        return response.data;
    },
    getCaderneta: async (params: { turma_id: string | number; disciplina_id: string | number; ano_letivo: number }) => {
        const response = await api.get('/avaliacoes/caderneta/', { params });
        return response.data;
    },
    postAbsence: async (absenceData: any) => {
        const response = await api.post('/avaliacoes/faltas/', absenceData);
        return response.data;
    },
    getAbsences: async (params?: any) => {
        const response = await api.get('/avaliacoes/faltas/', { params });
        return response.data;
    },
};

export const reportService = {
    getClassReport: async (params: { turma_id: number; disciplina_id: number }) => {
        const response = await api.get('/academico/relatorios/pauta_turma/', { params });
        return response.data;
    },
    getClassReportGeneral: async (params: { turma_id: number; trimestre: number }) => {
        const response = await api.get('/academico/relatorios/pauta_turma_geral/', { params });
        return response.data;
    },
    getSchoolSummary: async () => {
        const response = await api.get('/academico/relatorios/resumo_escola/');
        return response.data;
    },
    getStudentDeclaration: async (params: { aluno_id: number }) => {
        const response = await api.get('/academico/relatorios/declaracao_aluno/', { params });
        return response.data;
    },
};

export const academicRoleService = {
    getDTMinhaTurma: async () => {
        const response = await api.get('/academico/director-turma/minha_turma/');
        return response.data;
    },
    getDTDetalhes: async () => {
        const response = await api.get('/academico/director-turma/detalhes_turma/');
        return response.data;
    },
    setAlunoCargo: async (data: { aluno_id: number; cargo: string }) => {
        const response = await api.post('/academico/director-turma/atribuir_cargo_aluno/', data);
        return response.data;
    },
    moverAluno: async (data: { aluno_id: number; nova_turma_id: number }) => {
        const response = await api.post('/academico/director-turma/mover_aluno/', data);
        return response.data;
    },
    definirStatusAluno: async (data: { aluno_id: number; status: 'ATIVO' | 'DESISTENTE' | 'TRANSFERIDO' }) => {
        const response = await api.post('/academico/director-turma/definir_status_aluno/', data);
        return response.data;
    },
    transferirAluno: async (data: { aluno_id: number; escola_destino: string; motivo: string }) => {
        const response = await api.post('/academico/director-turma/transferir_aluno/', data);
        return response.data;
    },
    getDTAlunos: async () => {
        const response = await api.get('/academico/director-turma/alunos/');
        return response.data;
    },
    getCCResumoClasse: async () => {
        const response = await api.get('/academico/coordenador-classe/resumo_classe/');
        return response.data;
    },
    getCCTurmas: async () => {
        const response = await api.get('/academico/coordenador-classe/turmas_classe/');
        return response.data;
    },
    getDDResumoDisciplina: async () => {
        const response = await api.get('/academico/delegado-disciplina/resumo_disciplina/');
        return response.data;
    },
    getDDDetalhes: async () => {
        const response = await api.get('/academico/delegado-disciplina/detalhes_disciplina/');
        return response.data;
    },
};

export const staffService = {
    registerStaff: async (staffData: any) => {
        const response = await api.post('/administrativo/funcionarios/registar/', staffData);
        return response.data;
    },
};

export const adminService = {
    // Escolas
    getSchools: async (params?: any) => {
        const response = await api.get('/instituicoes/escolas/', { params });
        return Array.isArray(response.data) ? response.data : response.data.results || [];
    },
    createSchool: async (schoolData: any) => {
        const response = await api.post('/instituicoes/escolas/', schoolData);
        return response.data;
    },
    updateSchool: async (id: number, schoolData: any) => {
        const response = await api.patch(`/instituicoes/escolas/${id}/`, schoolData);
        return response.data;
    },
    deleteSchool: async (id: number) => {
        const response = await api.delete(`/instituicoes/escolas/${id}/`);
        return response.data;
    },
    // Distritos
    getDistricts: async () => {
        const response = await api.get('/core/districts/');
        return Array.isArray(response.data) ? response.data : response.data.results || [];
    },
    createDistrict: async (districtData: { name: string }) => {
        const response = await api.post('/core/districts/', districtData);
        return response.data;
    },
    updateDistrict: async (id: number, districtData: { name: string }) => {
        const response = await api.patch(`/core/districts/${id}/`, districtData);
        return response.data;
    },
    deleteDistrict: async (id: number) => {
        const response = await api.delete(`/core/districts/${id}/`);
        return response.data;
    },
    // Usuários
    getUsers: async (params?: any) => {
        const response = await api.get('/accounts/users/', { params });
        return response.data;
    },
    createUser: async (userData: any) => {
        const response = await api.post('/accounts/users/', userData);
        return response.data;
    },
};

export default api;
