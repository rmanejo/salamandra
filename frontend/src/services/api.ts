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
    logout: () => {
        localStorage.removeItem('token');
    },
};

export const institutionalService = {
    getDashboard: async () => {
        const response = await api.get('/instituicoes/director/dashboard/');
        return response.data;
    },
    toggleSchoolLock: async (lock: boolean) => {
        const response = await api.post('/instituicoes/director/bloquear_escola/', { bloquear: lock });
        return response.data;
    },
    getSchoolStatus: async () => {
        const response = await api.get('/instituicoes/director/dashboard/');
        return response.data;
    },
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
    moveStudent: async (id: number, nova_turma_id: number) => {
        const response = await api.post(`/academico/alunos/${id}/mover_turma/`, { nova_turma_id });
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
    getClasses: async () => {
        // Assuming classes are returned with turmas or we need a separate endpoint
        const response = await api.get('/academico/turmas/');
        return response.data;
    },
    formarTurmas: async (data: { classe_id: number; ano_letivo: number; min_alunos?: number; max_alunos?: number }) => {
        const response = await api.post('/academico/turmas/formar_turmas/', data);
        return response.data;
    },
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
