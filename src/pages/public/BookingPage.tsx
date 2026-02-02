/**
 * Booking Page - Migrated to Firebase
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, collection, query as firestoreQuery, where, getDocs } from '@/integrations/firebase/app';
import { getFirebaseFunctions } from '@/integrations/firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, Clock, CheckCircle2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PublicProfile {
    id: string;
    user_id: string;
    full_name: string;
    specialty: string;
    avatar_url: string;
    bio: string;
    slug: string;
}

interface BookingResponse {
    error?: string;
    success?: boolean;
}

export const BookingPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1: Select Date/Time, 2: Patient Info, 3: Success
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        notes: ''
    });
    const [bookingLoading, setBookingLoading] = useState(false);

    // Mock available times for now - In real app, fetch from database based on availability
    const availableTimes = [
        '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
    ];

    useEffect(() => {
        async function loadProfile() {
            if (!slug) return;
            try {
                const q = firestoreQuery(collection(db, 'profiles'), where('slug', '==', slug));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    throw new Error('Perfil não encontrado');
                }

                const data = querySnapshot.docs[0].data();
                setProfile(data as PublicProfile);
            } catch (error: unknown) {
                logger.error('Error loading profile', error, 'BookingPage');
                toast({
                    title: 'Perfil não encontrado',
                    description: error instanceof Error ? error.message : 'Não foi possível encontrar o profissional solicitado.',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [slug, toast]);

    const handleBooking = async () => {
        if (!profile || !selectedDate || !selectedTime) return;

        setBookingLoading(true);
        try {
            // Call Firebase Function for secure booking
            const functions = getFirebaseFunctions();
            const publicBookingFunction = httpsCallable(functions, 'public-booking');
            const result = await publicBookingFunction({
                slug,
                date: new Date(selectedDate).toISOString(),
                time: selectedTime,
                patient: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    notes: formData.notes
                }
            });

            const data = result.data as BookingResponse;

            if (data?.error) {
                throw new Error(data.error);
            }

            setStep(3);
        } catch (error: unknown) {
            logger.error('Error booking', error, 'BookingPage');
            toast({
                title: 'Erro ao agendar',
                description: error instanceof Error ? error.message : 'Não foi possível realizar o agendamento. Tente novamente ou entre em contato.',
                variant: 'destructive'
            });
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md text-center p-6">
                    <h2 className="text-xl font-bold mb-2">Profissional não encontrado</h2>
                    <p className="text-muted-foreground">O link que você acessou parece estar incorreto ou expirado.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Sidebar */}
                <Card className="md:col-span-1 h-fit">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="w-24 h-24 mb-4">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-2xl">{profile.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">{profile.full_name}</h2>
                        <Badge variant="secondary" className="mt-2 text-primary bg-primary/10 hover:bg-primary/20">
                            {profile.specialty || 'Fisioterapeuta'}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-4 text-left w-full">
                            {profile.bio || 'Bem-vindo ao meu agendamento online. Escolha um horário para sua consulta.'}
                        </p>
                    </CardContent>
                </Card>

                {/* Booking Flow */}
                <Card className="md:col-span-2">
                    {step === 1 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                    Escolha um horário
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="rounded-md border mx-auto md:mx-0"
                                        disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                                    />
                                    <div className="flex-1">
                                        <h3 className="font-medium mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Horários Disponíveis
                                        </h3>
                                        {!selectedDate ? (
                                            <p className="text-muted-foreground text-sm">Selecione uma data para ver os horários.</p>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2">
                                                {availableTimes.map((time) => (
                                                    <Button
                                                        key={time}
                                                        variant={selectedTime === time ? "default" : "outline"}
                                                        className={`w-full ${selectedTime === time ? "bg-primary text-white" : ""}`}
                                                        onClick={() => setSelectedTime(time)}
                                                    >
                                                        {time}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button
                                        disabled={!selectedDate || !selectedTime}
                                        onClick={() => setStep(2)}
                                    >
                                        Continuar
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary" />
                                    Seus Dados
                                </CardTitle>
                                <CardDescription>
                                    Informe seus dados para finalizar o agendamento em {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Seu nome completo"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone / WhatsApp</Label>
                                        <Input
                                            id="phone"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Observações (Opcional)</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Descreva brevemente o motivo da consulta..."
                                    />
                                </div>
                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                                    <Button
                                        onClick={handleBooking}
                                        disabled={!formData.name || !formData.phone || bookingLoading}
                                    >
                                        {bookingLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Confirmar Agendamento
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {step === 3 && (
                        <div className="p-8 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-green-700">Solicitação Enviada!</h2>
                            <p className="text-muted-foreground max-w-md">
                                Seu agendamento para <strong>{selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}</strong> foi recebido.
                                <br /><br />
                                Entraremos em contato pelo WhatsApp/Email para confirmar sua consulta em breve.
                            </p>
                            <Button onClick={() => window.location.reload()} className="mt-4">
                                Fazer novo agendamento
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
