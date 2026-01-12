import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Spinner, Button } from 'react-bootstrap';
import { administrativeService } from '../../services/api';
import { FaSync } from 'react-icons/fa';

interface Disciplina {
    id: number;
    nome: string;
    delegado_nome: string;
}

const GestaoDisciplinas: React.FC = () => {
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDisciplinas = async () => {
        setLoading(true);
        try {
            const data = await administrativeService.getDisciplinas();
            setDisciplinas(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error('Error fetching disciplinas', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisciplinas();
    }, []);

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-navy fw-bold">Gestão de Disciplinas</h2>
                <Button variant="outline-primary" size="sm" onClick={fetchDisciplinas} disabled={loading}>
                    <FaSync className={loading ? 'fa-spin' : ''} /> Atualizar
                </Button>
            </div>

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Disciplina</th>
                                <th className="px-4 py-3">Delegado de Disciplina (DD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-5">
                                        <Spinner animation="border" variant="primary" />
                                    </td>
                                </tr>
                            ) : disciplinas.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-5 text-muted">
                                        Nenhuma disciplina encontrada.
                                    </td>
                                </tr>
                            ) : (
                                disciplinas.map((disciplina) => (
                                    <tr key={disciplina.id}>
                                        <td className="px-4 py-3">{disciplina.id}</td>
                                        <td className="px-4 py-3 fw-medium">{disciplina.nome}</td>
                                        <td className="px-4 py-3">
                                            {disciplina.delegado_nome !== '-' ? (
                                                <span className="text-primary fw-medium">{disciplina.delegado_nome}</span>
                                            ) : (
                                                <span className="text-muted small">Não atribuído</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default GestaoDisciplinas;
