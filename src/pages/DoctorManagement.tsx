import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Stethoscope,
    Phone,
    Mail,
    MapPin,
    FileText,
    Filter,
} from 'lucide-react';
import { useDoctors, useDeleteDoctor } from '@/hooks/useDoctors';
import { DoctorFormModal } from '@/components/doctors/DoctorFormModal';
import type { Doctor } from '@/types/doctor';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';

export function DoctorManagement() {
    const { data: doctors = [], isLoading } = useDoctors();
    const deleteMutation = useDeleteDoctor();
    const [searchTerm, setSearchTerm] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('all');
    const [contactFilter, setContactFilter] = useState('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

    // Dynamic list of specialties for the filter
    const specialties = ['all', ...Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean)))];

    const filteredDoctors = doctors.filter((doctor) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            doctor.name.toLowerCase().includes(search) ||
            doctor.specialty?.toLowerCase().includes(search) ||
            doctor.clinic_name?.toLowerCase().includes(search)
        );

        const matchesSpecialty = specialtyFilter === 'all' || doctor.specialty === specialtyFilter;

        const matchesContact = contactFilter === 'all' ||
            (contactFilter === 'phone' && !!doctor.phone) ||
            (contactFilter === 'email' && !!doctor.email);

        return matchesSearch && matchesSpecialty && matchesContact;
    });

    const handleEdit = (doctor: Doctor) => {
        setSelectedDoctor(doctor);
        setIsFormOpen(true);
    };

    const handleDelete = (doctor: Doctor) => {
        if (confirm(`Tem certeza que deseja remover ${doctor.name}?`)) {
            deleteMutation.mutate(doctor.id);
        }
    };

    const handleCreateNew = () => {
        setSelectedDoctor(null);
        setIsFormOpen(true);
    };

    return (
        <MainLayout>
            <div className="container mx-auto py-8 px-4 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Stethoscope className="h-8 w-8 text-primary" />
                            Gerenciamento de Médicos
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Gerencie os médicos parceiros e suas informações de contato
                        </p>
                    </div>
                    <Button onClick={handleCreateNew} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Novo Médico
                    </Button>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, especialidade ou clínica..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                            <SelectTrigger className="w-[180px] h-11">
                                <Filter className="h-4 w-4 mr-2 opacity-50" />
                                <SelectValue placeholder="Especialidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas Especialidades</SelectItem>
                                {specialties.filter(s => s !== 'all').map(s => (
                                    <SelectItem key={s} value={s!}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={contactFilter} onValueChange={setContactFilter}>
                            <SelectTrigger className="w-[150px] h-11">
                                <SelectValue placeholder="Contato" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="phone">Com Telefone</SelectItem>
                                <SelectItem value="email">Com E-mail</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total de Médicos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{doctors.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Com Telefone</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {doctors.filter((d) => d.phone).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Com Email</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {doctors.filter((d) => d.email).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Doctors List */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="h-[200px]">
                            <CardHeader className="space-y-2">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <div className="pt-2 border-t mt-auto">
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredDoctors.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground mb-4">
                            {searchTerm
                                ? 'Nenhum médico encontrado com esse critério'
                                : 'Nenhum médico cadastrado ainda'}
                        </p>
                        {!searchTerm && (
                            <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Cadastrar Primeiro Médico
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDoctors.map((doctor) => (
                        <Card
                            key={doctor.id}
                            className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 relative overflow-hidden"
                        >
                            {/* Glassmorphism overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <CardHeader className="relative">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">
                                            {doctor.name}
                                        </CardTitle>
                                        {doctor.specialty && (
                                            <CardDescription className="mt-1">
                                                {doctor.specialty}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(doctor)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(doctor)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remover
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {doctor.crm && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs">
                                            CRM {doctor.crm}
                                            {doctor.crm_state && `-${doctor.crm_state}`}
                                        </Badge>
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="relative space-y-2">
                                {doctor.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{doctor.phone}</span>
                                    </div>
                                )}

                                {doctor.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{doctor.email}</span>
                                    </div>
                                )}

                                {doctor.clinic_name && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-medium">
                                                {doctor.clinic_name}
                                            </p>
                                            {doctor.clinic_address && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {doctor.clinic_address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {doctor.notes && (
                                    <div className="flex items-start gap-2 text-sm pt-2 border-t">
                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {doctor.notes}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Form Modal */}
                <DoctorFormModal
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    doctor={selectedDoctor}
                    onSuccess={() => {
                        setIsFormOpen(false);
                        setSelectedDoctor(null);
                    }}
                />
            </div>
        </MainLayout>
    );
}
