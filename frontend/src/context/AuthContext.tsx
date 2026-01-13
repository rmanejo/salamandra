import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    role_display: string;
    school_name?: string;
    school_blocked?: boolean;
    district_name?: string;
    academic_roles?: {
        is_dt: boolean;
        is_cc: boolean;
        is_dd: boolean;
    };
    can_lancar_notas?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/accounts/login/', { email, password });

            const userData: User = {
                id: response.data.id,
                email: response.data.email,
                first_name: response.data.first_name,
                last_name: response.data.last_name,
                role: response.data.role,
                role_display: response.data.role_display,
                school_name: response.data.school_name,
                school_blocked: response.data.school_blocked,
                district_name: response.data.district_name,
                academic_roles: response.data.academic_roles,
                can_lancar_notas: response.data.can_lancar_notas
            };

            // Store token if provided, otherwise use a session identifier
            const authToken = response.data.token || `session-${Date.now()}`;

            localStorage.setItem('token', authToken);
            localStorage.setItem('user', JSON.stringify(userData));

            setToken(authToken);
            setUser(userData);
        } catch (error: any) {
            console.error('Login error:', error);
            throw new Error(error.response?.data?.message || 'Credenciais inválidas');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
