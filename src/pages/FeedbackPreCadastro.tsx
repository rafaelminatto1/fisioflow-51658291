import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import '../styles/PreCadastroPremium.css';

const FeedbackPreCadastro = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('usuario_nome');
    if (name) {
      setUserName(name.split(' ')[0]);
    }
  }, []);

  return (
    <div className="premium-container">
      {/* Background Glow Blobs */}
      <div className="glow-blob blob-teal"></div>
      <div className="glow-blob blob-purple"></div>

      <div className="premium-card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            background: 'rgba(19, 236, 200, 0.1)', 
            padding: '1.5rem', 
            borderRadius: '50%',
            border: '2px solid rgba(19, 236, 200, 0.3)'
          }}>
            <CheckCircle2 color="#13ecc8" size={64} strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="premium-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          TUDO PRONTO!
        </h1>
        
        <p style={{ 
          color: 'white', 
          fontSize: '1.25rem', 
          marginBottom: '2rem',
          lineHeight: '1.6',
          opacity: 0.9 
        }}>
          Olá, <strong>{userName || 'Fisioterapeuta'}</strong>! <br />
          Seu acesso prioritário ao <strong>FisioFlow Premium</strong> foi garantido com sucesso.
        </p>

        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '16px', 
          padding: '1.5rem', 
          marginBottom: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'left'
        }}>
          <h3 style={{ color: '#13ecc8', fontSize: '0.875rem', fontWeight: 900, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Próximos passos:
          </h3>
          <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.925rem', paddingLeft: '1.25rem', margin: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>Verifique seu e-mail para confirmar o cadastro.</li>
            <li style={{ marginBottom: '0.5rem' }}>Em breve, nossa equipe entrará em contato via WhatsApp.</li>
            <li>Prepare-se para transformar sua rotina clínica.</li>
          </ul>
        </div>

        <button 
          onClick={() => navigate('/auth')} 
          className="premium-button"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          Ir para o Início
          <ChevronRight size={20} />
        </button>

        <p style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
          Qualquer dúvida, conte com nosso suporte em tempo real.
        </p>
      </div>
    </div>
  );
};

export default FeedbackPreCadastro;
