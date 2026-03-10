import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Patient, Evolution } from '@/types';

/**
 * Generates a high-quality, professional PDF report for patient evolution.
 * Uses modern CSS patterns for a clean, medical-grade look.
 */
export async function generateEvolutionPDF(patient: Patient, evolutions: Evolution[]) {
  const sortedEvolutions = [...evolutions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const primaryColor = '#0EA5E9'; // Modern Sky Blue
  const secondaryColor = '#64748B';
  const borderColor = '#E2E8F0';
  const backgroundColor = '#F8FAFC';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 20mm; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            color: #1E293B; 
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          
          /* Header Styles */
          .document-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .brand-container { flex: 1; }
          .brand-name { 
            font-size: 28px; 
            font-weight: 800; 
            color: ${primaryColor}; 
            letter-spacing: -0.5px;
            margin: 0;
          }
          .document-type { 
            font-size: 14px; 
            font-weight: 600; 
            color: ${secondaryColor}; 
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .header-meta { text-align: right; font-size: 12px; color: ${secondaryColor}; }

          /* Patient Profile Section */
          .profile-section {
            background-color: ${backgroundColor};
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            border: 1px solid ${borderColor};
          }
          .profile-item { margin-bottom: 8px; }
          .profile-label { 
            font-size: 11px; 
            font-weight: 700; 
            color: ${secondaryColor}; 
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
          }
          .profile-value { font-size: 15px; font-weight: 600; color: #0F172A; }

          /* Evolution List */
          .evolution-container { margin-top: 20px; }
          .evolution-entry {
            margin-bottom: 32px;
            padding-left: 16px;
            border-left: 4px solid ${borderColor};
            page-break-inside: avoid;
          }
          .evolution-entry:hover { border-left-color: ${primaryColor}; }
          
          .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .entry-date { font-size: 16px; font-weight: 700; color: #0F172A; }
          .pain-indicator {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
          }
          .pain-low { background-color: #DCFCE7; color: #166534; }
          .pain-med { background-color: #FEF9C3; color: #854D0E; }
          .pain-high { background-color: #FEE2E2; color: #991B1B; }

          /* SOAP Sections */
          .soap-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .soap-box { margin-bottom: 12px; }
          .soap-tag {
            display: inline-block;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
            background-color: #F1F5F9;
            color: #475569;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            margin-right: 8px;
          }
          .soap-title { font-size: 13px; font-weight: 700; color: ${secondaryColor}; vertical-align: middle; }
          .soap-text { font-size: 14px; margin-top: 6px; color: #334155; text-align: justify; }

          /* Footer */
          .report-footer {
            margin-top: 60px;
            padding-top: 24px;
            border-top: 1px solid ${borderColor};
            text-align: center;
            font-size: 11px;
            color: ${secondaryColor};
          }
        </style>
      </head>
      <body>
        <div class="document-header">
          <div class="brand-container">
            <h1 class="brand-name">FisioFlow Pro</h1>
            <div class="document-type">Prontuário de Evolução Fisioterapêutica</div>
          </div>
          <div class="header-meta">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}<br/>
            Às ${format(new Date(), "HH:mm")}
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-column">
            <div class="profile-item">
              <span class="profile-label">Paciente</span>
              <span class="profile-value">${patient.name}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Data de Nascimento</span>
              <span class="profile-value">${patient.birthDate ? format(new Date(patient.birthDate), 'dd/MM/yyyy') : 'Não informada'}</span>
            </div>
          </div>
          <div class="profile-column">
            <div class="profile-item">
              <span class="profile-label">Condição Principal</span>
              <span class="profile-value">${patient.condition || 'Geral'}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Total de Atendimentos</span>
              <span class="profile-value">${evolutions.length} sessões</span>
            </div>
          </div>
        </div>

        <div class="evolution-container">
          ${sortedEvolutions.map(ev => {
            const painValue = ev.painLevel || 0;
            const painClass = painValue <= 3 ? 'pain-low' : painValue <= 6 ? 'pain-med' : 'pain-high';
            
            return `
              <div class="evolution-entry">
                <div class="entry-header">
                  <span class="entry-date">${format(new Date(ev.date), "dd/MM/yyyy • HH:mm")}</span>
                  ${ev.painLevel !== undefined ? `
                    <span class="pain-indicator ${painClass}">DOR: ${ev.painLevel}/10</span>
                  ` : ''}
                </div>
                
                <div class="soap-grid">
                  ${ev.subjective ? `
                    <div class="soap-box">
                      <span class="soap-tag">S</span><span class="soap-title">Subjetivo</span>
                      <p class="soap-text">${ev.subjective}</p>
                    </div>
                  ` : ''}
                  
                  ${ev.objective ? `
                    <div class="soap-box">
                      <span class="soap-tag">O</span><span class="soap-title">Objetivo</span>
                      <p class="soap-text">${ev.objective}</p>
                    </div>
                  ` : ''}
                  
                  ${ev.assessment ? `
                    <div class="soap-box">
                      <span class="soap-tag">A</span><span class="soap-title">Avaliação</span>
                      <p class="soap-text">${ev.assessment}</p>
                    </div>
                  ` : ''}
                  
                  ${ev.plan ? `
                    <div class="soap-box">
                      <span class="soap-tag">P</span><span class="soap-title">Plano</span>
                      <p class="soap-text">${ev.plan}</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="report-footer">
          Documento emitido via FisioFlow Pro - Sistema de Gestão Fisioterapêutica.<br/>
          As informações contidas neste relatório são de responsabilidade do profissional assistente.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, { 
      UTI: '.pdf', 
      mimeType: 'application/pdf',
      dialogTitle: `Relatório_${patient.name.replace(/\s/g, '_')}`
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error('Não foi possível gerar o PDF. Verifique os dados do paciente.');
  }
}
