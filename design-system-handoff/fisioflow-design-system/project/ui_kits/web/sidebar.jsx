// Sidebar — FisioFlow web
const { Icon } = window.FZ;

const NAV = [
  { group: 'ATENDIMENTO', items: [
    { id: 'agenda',     label: 'AGENDA',          icon: 'calendar-days' },
    { id: 'pacientes',  label: 'PACIENTES',       icon: 'users' },
    { id: 'whatsapp',   label: 'WHATSAPP',        icon: 'message-circle', badge: 3 },
  ]},
  { group: 'CLÍNICA', items: [
    { id: 'exercicios', label: 'EXERCÍCIOS',      icon: 'dumbbell' },
    { id: 'protocolos', label: 'PROTOCOLOS',      icon: 'clipboard-list' },
    { id: 'testes',     label: 'TESTES CLÍNICOS', icon: 'flask-conical' },
    { id: 'avaliacoes', label: 'AVALIAÇÕES',      icon: 'clipboard-check' },
    { id: 'biomecanica',label: 'BIOMECÂNICA',     icon: 'camera' },
  ]},
  { group: 'INTELIGÊNCIA & IA', items: [
    { id: 'ia-studio',  label: 'IA STUDIO CENTRAL', icon: 'sparkles', badge: 'PRO' },
    { id: 'hub',        label: 'HUB DE INTELIGÊNCIA', icon: 'brain' },
  ]},
  { group: 'GESTÃO & OPERAÇÃO', items: [
    { id: 'eventos',    label: 'EVENTOS',         icon: 'calendar-clock' },
    { id: 'boards',     label: 'BOARDS',          icon: 'layout-dashboard' },
    { id: 'cadastros',  label: 'CADASTROS',       icon: 'database' },
    { id: 'wiki',       label: 'WIKI CLÍNICA',    icon: 'book-open' },
  ]},
];

const Sidebar = ({ active, onNavigate }) => {
  return (
    <aside className="fz-sidebar">
      <div className="fz-sidebar-brand">
        <div className="fz-sidebar-logo">
          <Icon name="activity" size={22} />
        </div>
        <div>
          <div className="fz-sidebar-brand-name">FisioFlow</div>
          <div className="fz-sidebar-brand-sub">MOOCA FISIO</div>
        </div>
      </div>

      <div className="fz-sidebar-search">
        <Icon name="search" size={14} />
        <input placeholder="Buscar paciente..." />
        <kbd>⌘K</kbd>
      </div>

      <nav className="fz-sidebar-nav">
        {NAV.map(group => (
          <div key={group.group} className="fz-sidebar-group">
            <div className="fz-sidebar-group-label">{group.group}</div>
            {group.items.map(item => {
              const isActive = item.id === active;
              return (
                <button
                  key={item.id}
                  className={`fz-sidebar-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => onNavigate?.(item.id)}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`fz-sidebar-badge ${typeof item.badge === 'number' ? 'is-count' : ''}`}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="fz-sidebar-foot">
        <button className="fz-sidebar-item">
          <Icon name="log-out" size={16} />
          <span>SAIR</span>
        </button>
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
