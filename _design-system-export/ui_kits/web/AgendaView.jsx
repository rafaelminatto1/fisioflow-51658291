// AgendaView — week grid recreation of /agenda
const { Icon, Button, Badge } = window.FZ;

const DAYS = ['SEG. 11/05','TER. 12/05','QUA. 13/05','QUI. 14/05','SEX. 15/05','SÁB. 16/05'];
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'];

// each appt: [dayIdx, hourIdx, name, status]
const APPTS = [
  [0,2,'Carla Ferreira','confirmed'],
  [0,2,'Diego Costa','consulta'],
  [1,3,'Elisa Rodrigues','pending'],
  [2,3,'Elisa Rodrigues','confirmed'],
  [2,4,'Felipe Oliveira','consulta'],
  [3,1,'Carla Ferreira','confirmed'],
  [3,3,'Diego Costa','consulta'],
  [3,4,'Felipe Oliveira','consulta'],
  [4,1,'Carla Ferreira','confirmed'],
  [4,3,'Diego Costa','consulta'],
  [4,4,'Felipe Oliveira','consulta'],
  [5,1,'Carla Ferreira','confirmed'],
  [5,3,'Diego Costa','consulta'],
  [5,4,'Felipe Oliveira','consulta'],
  [2,6,'Gabriela Alves','consulta'],
  [3,6,'Gabriela Alves','consulta'],
  [4,6,'Gabriela Alves','consulta'],
  [5,6,'Gabriela Alves','consulta'],
  [2,7,'Hugo Martins','consulta'],
  [3,7,'Hugo Martins','consulta'],
  [4,7,'Hugo Martins','consulta'],
  [5,7,'Hugo Martins','consulta'],
  [2,8,'Isabela Nunes','consulta'],
  [3,8,'Isabela Nunes','consulta'],
  [4,8,'Isabela Nunes','consulta'],
  [5,8,'Isabela Nunes','consulta'],
];

const StatusBlock = ({ name, status, time }) => {
  const cls = {
    consulta: 'fz-appt-consulta',
    confirmed: 'fz-appt-confirmed',
    pending: 'fz-appt-pending',
    cancelled: 'fz-appt-cancelled',
  }[status] || 'fz-appt-consulta';
  return (
    <div className={`fz-appt ${cls}`}>
      <div className="fz-appt-meta">
        <span>{status === 'consulta' ? 'CONSULTA' : status === 'confirmed' ? '● CONFIRMADO' : status === 'pending' ? '● PENDENTE' : status.toUpperCase()}</span>
        <span className="fz-appt-time"><Icon name="clock" size={10}/> {time}</span>
      </div>
      <div className="fz-appt-name">QA_AUTO_ {name}</div>
    </div>
  );
};

const AgendaView = () => {
  return (
    <div className="fz-agenda">
      <div className="fz-agenda-bar">
        <div className="fz-agenda-bar-left">
          <Button variant="ghost" size="icon" aria-label="prev"><Icon name="chevron-left" size={14}/></Button>
          <Button variant="outline" size="sm">HOJE</Button>
          <Button variant="ghost" size="icon" aria-label="next"><Icon name="chevron-right" size={14}/></Button>
          <div className="fz-agenda-date"><Icon name="calendar" size={14}/> 12 de maio de 2026</div>
        </div>
        <div className="fz-agenda-bar-center">
          <input className="fz-input fz-input-sm" placeholder="Buscar paciente"/>
        </div>
        <div className="fz-agenda-bar-right">
          <div className="fz-tabs">
            <button>DIA</button>
            <button className="is-active">SEMANA</button>
            <button>MÊS</button>
          </div>
          <Button variant="warning" size="sm"><Icon name="message-circle" size={14}/> REENGAJAR</Button>
        </div>
      </div>

      <div className="fz-agenda-grid" style={{gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)`}}>
        <div className="fz-agenda-corner" />
        {DAYS.map(d => <div key={d} className="fz-agenda-day-head">{d}</div>)}
        {HOURS.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="fz-agenda-hour">{h}</div>
            {DAYS.map((_, di) => {
              const cellAppts = APPTS.filter(a => a[0]===di && a[1]===hi);
              return (
                <div key={di+'-'+hi} className="fz-agenda-cell">
                  {cellAppts.map((a, i) => (
                    <StatusBlock key={i} name={a[2]} status={a[3]} time={`${HOURS[hi]} - ${(parseInt(HOURS[hi])+1).toString().padStart(2,'0')}:00`} />
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

window.AgendaView = AgendaView;
