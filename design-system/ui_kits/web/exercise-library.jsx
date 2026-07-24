// ExerciseLibrary — grid of exercise cards
const { Icon, Button, Badge } = window.FZ;

const EXERCISES = [
  { name:'4 Apoios (Four Point kneeling)', desc:'O exercício de 4 Apoios é uma postura fundamental na reabilitação, visando estabelecer uma base de estabilização do core...', tag:'Core / Estabilização', video:true, sets:'3x · 12 reps', tone:'pink' },
  { name:'Ab Wheel Rollout', desc:'O Ab Wheel Rollout é um exercício avançado que visa fortalecer a musculatura do core, com foco primário no reto abdominal...', tag:'Core / Estabilização', video:true, sets:'3x · 12 reps', tone:'orange' },
  { name:'Abdominal', desc:'Fortalecimento do reto abdominal com foco em flexão torácica.', tag:'Core', video:false, sets:'3x · 12 reps', tone:'red' },
  { name:'Abdominal Bicicleta', desc:'Fortalecimento de oblíquos e reto abdominal em padrão dinâmico.', tag:'Core', video:false, sets:'3x · 15 reps', tone:'blue' },
  { name:'Abdominal Crupeado', desc:'O abdominal crunch (também conhecido como encolhimento abdominal ou abdominal supra) é um exercício fundamental focado...', tag:'Core', video:true, sets:'3x · 20 reps', tone:'orange' },
  { name:'Abdominal Oblíquo', desc:'O abdominal oblíquo é um exercício fundamental na fisioterapia clínica e reabilitação, focado no fortalecimento seletivo dos músculos...', tag:'Core', video:true, sets:'3x · 12 reps', tone:'green' },
];

const Thumb = ({ tone }) => {
  // placeholder anatomy-style block
  const grad = {
    pink:   'linear-gradient(160deg, #fde2e7, #f0c4d0)',
    orange: 'linear-gradient(160deg, #fee9d4, #f8c890)',
    red:    'linear-gradient(160deg, #fcd9d9, #f4a8a8)',
    blue:   'linear-gradient(160deg, #d9e8fc, #a8c5f4)',
    green:  'linear-gradient(160deg, #dcf4e3, #a8d4b6)',
  }[tone] || 'linear-gradient(160deg, #eef0f3, #cfd4dc)';
  return (
    <div className="fz-ex-thumb" style={{background: grad}}>
      <svg viewBox="0 0 100 100" width="60" height="60" style={{opacity:0.35}}>
        <ellipse cx="50" cy="30" rx="14" ry="16" fill="#6b7280"/>
        <rect x="30" y="44" width="40" height="36" rx="8" fill="#6b7280"/>
        <rect x="22" y="50" width="10" height="22" rx="4" fill="#6b7280"/>
        <rect x="68" y="50" width="10" height="22" rx="4" fill="#6b7280"/>
      </svg>
    </div>
  );
};

const ExerciseLibrary = () => (
  <div className="fz-ex-lib">
    <div className="fz-ex-tabs">
      <button className="is-active"><Icon name="book-open" size={14}/> Biblioteca <span className="count">351</span></button>
      <button><Icon name="video" size={14}/> Mídias</button>
      <button><Icon name="file-text" size={14}/> Templates <span className="count">50</span></button>
      <button><Icon name="clipboard-list" size={14}/> Protocolos <span className="count">55</span></button>
      <button className="is-ai"><Icon name="sparkles" size={14}/> IA Assistente <Badge variant="default">NOVO</Badge></button>
      <button><Icon name="activity" size={14}/> Analytics</button>
    </div>

    <div className="fz-ex-filters">
      <div className="fz-input-icon" style={{flex:1}}>
        <Icon name="search" size={14}/>
        <input className="fz-input fz-input-sm" placeholder="Buscar exercícios..."/>
      </div>
      <Button variant="default" size="sm">Todos</Button>
      <Button variant="ghost" size="sm"><Icon name="heart" size={14}/> Favoritos</Button>
      <Button variant="ghost" size="sm"><Icon name="video-off" size={14}/> Sem Vídeo</Button>
      <Button variant="ghost" size="sm">Selecionar Vários</Button>
      <span className="fz-muted">351 resultados</span>
      <div style={{flex:1}}/>
      <Button variant="outline" size="sm">Partes do Corpo ▾</Button>
      <Button variant="outline" size="sm">Dificuldade ▾</Button>
      <Button variant="outline" size="sm">Categoria ▾</Button>
    </div>

    <div className="fz-ex-grid">
      {EXERCISES.map(ex => (
        <div key={ex.name} className="fz-ex-card">
          <div className="fz-ex-thumb-wrap">
            <Thumb tone={ex.tone}/>
            <button className="fz-ex-fav" aria-label="favorito"><Icon name="heart" size={14}/></button>
            <span className={`fz-ex-vbadge ${ex.video ? 'has' : 'no'}`}>
              <Icon name={ex.video ? 'video' : 'video-off'} size={11}/> {ex.video ? 'Vídeo' : 'Sem vídeo'}
            </span>
          </div>
          <div className="fz-ex-body">
            <div className="fz-ex-title">{ex.name}</div>
            <div className="fz-ex-desc">{ex.desc}</div>
            <Badge variant="secondary" className="fz-ex-tag">{ex.tag}</Badge>
            <div className="fz-ex-meta">
              <span><Icon name="repeat" size={12}/> {ex.sets.split(' · ')[0]}</span>
              <span>{ex.sets.split(' · ')[1]}</span>
            </div>
            <Button variant="default" size="sm" className="fz-ex-cta"><Icon name="eye" size={14}/> Ver Detalhes</Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

window.ExerciseLibrary = ExerciseLibrary;
