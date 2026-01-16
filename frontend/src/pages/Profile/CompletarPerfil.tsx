import React, { useEffect, useState } from 'react';
import { Card, Col, Container, Form, Row, Button, Alert, ProgressBar } from 'react-bootstrap';
import { profileService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const steps = [
    { id: 1, title: 'Formação' },
    { id: 2, title: 'Contacto' },
];

const CompletarPerfil: React.FC = () => {
    const [step, setStep] = useState(1);
    const [areaFormacao, setAreaFormacao] = useState('');
    const [nivelAcademico, setNivelAcademico] = useState('');
    const [contacto, setContacto] = useState('');
    const [assinatura, setAssinatura] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await profileService.getProfile();
                setAreaFormacao(data.area_formacao || '');
                setNivelAcademico(data.nivel_academico || '');
                setContacto(data.contacto || '');
            } catch (err) {
                console.error('Erro ao carregar perfil', err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const validateStep = () => {
        if (step === 1) {
            return areaFormacao.trim() && nivelAcademico.trim();
        }
        return contacto.trim();
    };

    const handleNext = () => {
        if (!validateStep()) {
            setError('Preencha todos os campos obrigatórios antes de continuar.');
            return;
        }
        setError('');
        setStep((prev) => Math.min(prev + 1, steps.length));
    };

    const handleBack = () => {
        setError('');
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!areaFormacao.trim() || !nivelAcademico.trim() || !contacto.trim()) {
            setError('Preencha todos os campos obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('area_formacao', areaFormacao.trim());
            formData.append('nivel_academico', nivelAcademico.trim());
            formData.append('contacto', contacto.trim());
            if (assinatura) {
                formData.append('assinatura', assinatura);
            }
            const updated = await profileService.updateProfile(formData);
            if (updated.is_complete) {
                setSuccess('Perfil completo com sucesso!');
                setTimeout(() => navigate('/professor'), 1200);
                return;
            }
            setSuccess('Perfil atualizado.');
        } catch (err: any) {
            console.error('Erro ao salvar perfil', err);
            const message = err?.response?.data?.detail || 'Não foi possível atualizar o perfil.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const progress = Math.round((step / steps.length) * 100);

    if (loading) {
        return (
            <div className="p-4">
                <div className="spinner-border text-primary" role="status" />
            </div>
        );
    }

    return (
        <Container fluid>
            <Row className="mb-4">
                <Col>
                    <h2 className="fw-bold">Completar Perfil Profissional</h2>
                    <p className="text-secondary">Preencha os dados obrigatórios para gerar documentos oficiais.</p>
                </Col>
            </Row>

            <Card className="border-0 shadow-sm">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="fw-semibold">{steps.find((s) => s.id === step)?.title}</div>
                        <div className="text-muted small">
                            Passo {step} de {steps.length}
                        </div>
                    </div>
                    <ProgressBar now={progress} className="mb-4" />

                    {error && (
                        <Alert variant="danger" onClose={() => setError('')} dismissible>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                            {success}
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group controlId="nivelAcademico">
                                        <Form.Label className="fw-bold">Habilitações Académicas *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={nivelAcademico}
                                            onChange={(e) => setNivelAcademico(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group controlId="areaFormacao">
                                        <Form.Label className="fw-bold">Área de Formação *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={areaFormacao}
                                            onChange={(e) => setAreaFormacao(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        {step === 2 && (
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group controlId="contacto">
                                        <Form.Label className="fw-bold">Contacto *</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={contacto}
                                            onChange={(e) => setContacto(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group controlId="assinatura">
                                        <Form.Label className="fw-bold">Assinatura (opcional)</Form.Label>
                                        <Form.Control
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setAssinatura(file);
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        <div className="mt-4 d-flex justify-content-between">
                            <Button
                                variant="outline-secondary"
                                onClick={handleBack}
                                disabled={step === 1}
                            >
                                Voltar
                            </Button>
                            {step < steps.length ? (
                                <Button variant="primary" onClick={handleNext}>
                                    Continuar
                                </Button>
                            ) : (
                                <Button variant="success" type="submit" disabled={saving}>
                                    {saving ? 'A guardar...' : 'Concluir'}
                                </Button>
                            )}
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default CompletarPerfil;
