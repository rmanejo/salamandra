import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const GenericDashboard: React.FC<{ title: string }> = ({ title }) => {
    const { user } = useAuth();

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">{title}</h2>
            <Card className="shadow-sm border-0 p-4">
                <p>Bem-vindo, {user?.first_name} {user?.last_name}.</p>
                <p>Função: {user?.role_display}</p>
                <p>Escola: {user?.school_name || 'N/A'}</p>
            </Card>
        </Container>
    );
};

export default GenericDashboard;
