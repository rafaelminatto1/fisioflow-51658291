import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoConsultation } from '@/components/telemedicine/VideoConsultation';
import { Video } from 'lucide-react';

const Telemedicine = () => {
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
            <Video className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Telemedicina</h1>
            <p className="text-muted-foreground">
              Realize consultas online com seus pacientes
            </p>
          </div>
        </div>

        <VideoConsultation />
      </div>
    </MainLayout>
  );
};

export default Telemedicine;
