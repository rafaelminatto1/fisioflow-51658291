import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from '@/components/ui/file-upload';
import { Badge } from '@/components/ui/badge';
import { STORAGE_BUCKETS } from '@/lib/supabase/storage';

export default function FileUploadTest() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sistema de Upload de Arquivos</h1>
        <p className="text-muted-foreground">
          Teste das funcionalidades de upload para diferentes tipos de arquivos
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload de Documentos de Pacientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Documentos de Pacientes
              <Badge variant="secondary">PDF, DOC, Imagens</Badge>
            </CardTitle>
            <CardDescription>
              Upload de documentos médicos, exames e relatórios de pacientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              bucket="PATIENT_DOCUMENTS"
              folder="test-patient/documents"
              multiple
              maxFiles={5}
              accept={{
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'image/*': ['.jpg', '.jpeg', '.png']
              }}
              placeholder="Arraste documentos médicos aqui ou clique para selecionar"
              onSuccess={(result) => {
                console.log('Documento enviado:', result);
              }}
              onError={(error) => {
                console.error('Erro no upload:', error);
              }}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Upload de Avatares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Avatar do Usuário
              <Badge variant="secondary">Apenas Imagens</Badge>
            </CardTitle>
            <CardDescription>
              Upload de foto de perfil do usuário (máximo 2MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              bucket="PROFILE_AVATARS"
              folder="test-user/avatar"
              multiple={false}
              maxFiles={1}
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png']
              }}
              placeholder="Selecione uma foto de perfil"
              onSuccess={(result) => {
                console.log('Avatar enviado:', result);
              }}
              onError={(error) => {
                console.error('Erro no upload do avatar:', error);
              }}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Upload de Mídia de Exercícios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Mídia de Exercícios
              <Badge variant="secondary">Imagens e Vídeos</Badge>
            </CardTitle>
            <CardDescription>
              Upload de imagens e vídeos demonstrativos de exercícios (máximo 50MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              bucket="EXERCISE_MEDIA"
              folder="test-exercise/media"
              multiple
              maxFiles={10}
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png'],
                'video/*': ['.mp4', '.webm']
              }}
              placeholder="Arraste imagens ou vídeos de exercícios aqui"
              onSuccess={(result) => {
                console.log('Mídia de exercício enviada:', result);
              }}
              onError={(error) => {
                console.error('Erro no upload da mídia:', error);
              }}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Upload de Arquivos de Tratamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Arquivos de Tratamento
              <Badge variant="secondary">Documentos Diversos</Badge>
            </CardTitle>
            <CardDescription>
              Upload de planos de tratamento, relatórios e outros documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              bucket="TREATMENT_FILES"
              folder="test-treatment/files"
              multiple
              maxFiles={8}
              accept={{
                'application/pdf': ['.pdf'],
                'text/plain': ['.txt'],
                'image/*': ['.jpg', '.jpeg', '.png']
              }}
              placeholder="Selecione arquivos de tratamento"
              onSuccess={(result) => {
                console.log('Arquivo de tratamento enviado:', result);
              }}
              onError={(error) => {
                console.error('Erro no upload do arquivo:', error);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Informações sobre os Buckets */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração dos Buckets</CardTitle>
          <CardDescription>
            Informações sobre os buckets de armazenamento configurados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(STORAGE_BUCKETS).map(([key, value]) => (
              <div key={key} className="p-3 border rounded-lg">
                <div className="font-medium">{key.replace(/_/g, ' ')}</div>
                <div className="text-sm text-muted-foreground">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}