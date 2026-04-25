import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Stethoscope,
  Phone,
  MapPin,
  Filter,
} from "lucide-react";
import { useDoctors, useDeleteDoctor } from "@/hooks/useDoctors";
import { DoctorFormModal } from "@/components/doctors/DoctorFormModal";
import type { Doctor } from "@/types/doctor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DoctorManagementContent() {
  const { data: doctors = [], isLoading } = useDoctors();
  const deleteMutation = useDeleteDoctor();
  const [searchTerm, setSearchTerm] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [contactFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Dynamic list of specialties for the filter
  const specialties = [
    "all",
    ...Array.from(new Set(doctors.map((d) => d.specialty).filter(Boolean))),
  ];

  const filteredDoctors = doctors.filter((doctor) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      doctor.name.toLowerCase().includes(search) ||
      doctor.specialty?.toLowerCase().includes(search) ||
      doctor.clinic_name?.toLowerCase().includes(search);

    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty === specialtyFilter;

    const matchesContact =
      contactFilter === "all" ||
      (contactFilter === "phone" && !!doctor.phone) ||
      (contactFilter === "email" && !!doctor.email);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Médicos Parceiros</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie o relacionamento com médicos prescritores
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Médico
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, especialidade ou clínica..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2 opacity-50" />
              <SelectValue placeholder="Especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {specialties
                .filter((s) => s !== "all")
                .map((s) => (
                  <SelectItem key={s} value={s!}>
                    {s}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Doctors List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[180px]">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum médico encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDoctors.map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-md transition-shadow relative">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{doctor.name}</CardTitle>
                    <CardDescription className="text-xs truncate">
                      {doctor.specialty || "Sem especialidade"}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {doctor.crm && (
                  <Badge variant="secondary" className="text-[10px]">
                    CRM {doctor.crm}
                  </Badge>
                )}
                {doctor.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {doctor.phone}
                  </div>
                )}
                {doctor.clinic_name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {doctor.clinic_name}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
  );
}

export function DoctorManagement() {
  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <DoctorManagementContent />
      </div>
    </MainLayout>
  );
}
