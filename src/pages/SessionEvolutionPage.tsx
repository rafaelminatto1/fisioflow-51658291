import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SessionEvolutionContainer } from '@/components/evolution/SessionEvolutionContainer';

const SessionEvolutionPage: React.FC = () => {
  return (
    <MainLayout>
      <SessionEvolutionContainer mode="page" />
    </MainLayout>
  );
};

export default SessionEvolutionPage;
