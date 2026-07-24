// PatientList — table view of patients
const { Icon, Button, Badge, Avatar } = window.FZ;

const PATIENTS = [
  { name: 'Carla Ferreira',   cpf: '342.118.***-09', last: '08/05/2026', protocol: 'Reabilitação ombro', sessions: '8/12', status: 'ativo',     tone: 'teal' },
  { name: 'Diego Costa',      cpf: '019.554.***-12', last: '12/05/2026', protocol: 'Pós-cirúrgico LCA',  sessions: '15/20',status: 'ativo',     tone: 'blue' },
  { name: 'Elisa Rodrigues',  cpf: '887.221.***-44', last: '11/05/2026', protocol: 'Lombalgia crônica',   sessions: '3/10', status: 'ativo',     tone: 'amber' },
  { name: 'Felipe Oliveira',  cpf: '120.987.***-66', last: '10/05/2026', protocol: 'Tendinite supraespinhal','sessions':'6/8','status':'ativo','tone':'gray' },
  { name: 'Gabriela Alves',   cpf: '443.116.***-21', last: '05/05/2026', protocol: 'Avaliação inicial',   sessions: '1/12', status: 'novo',      tone: 'teal' },
  { name: 'Hugo Martins',     cpf: '776.334.***-08', last: '02/05/2026', protocol: 'Joelho — meniscopatia','sessions':'4/15','status':'em pausa','tone':'amber' },
  { name: 'Isabela Nunes',    cpf: '901.443.***-77', last: '12/05/2026', protocol: 'Pilates clínico',     sessions: '22/24',status: 'ativo',     tone: 'blue' },
  { name: 'João Silva',       cpf: '554.221.***-19', last: '24/04/2026', protocol: 'Cervicalgia',         sessions: '6/8',  status: 'pendente',  tone: 'gray' },
];

const statusBadge = {
  ativo: <Badge variant="success">ATIVO</Badge>,
  novo: <Badge variant="default">NOVO</Badge>,
  'em pausa': <Badge variant="warning">EM PAUSA</Badge>,
  pendente: <Badge variant="outline">PENDENTE</Badge>,
};

const PatientList = () => {
  const [q, setQ] = React.useState('');
  const filtered = PATIENTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fz-patients">
      <div className="fz-patients-bar">
        <div className="fz-input-icon">
          <Icon name="search" size={14}/>
          <input className="fz-input fz-input-sm" placeholder="Buscar paciente..." value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
        <Button variant="outline" size="sm"><Icon name="settings" size={14}/> Filtros</Button>
        <Button variant="outline" size="sm">Exportar</Button>
        <div style={{flex:1}}/>
        <Button variant="default" size="sm"><Icon name="plus" size={14}/> Novo Paciente</Button>
      </div>

      <table className="fz-table">
        <thead>
          <tr>
            <th></th>
            <th>Nome</th>
            <th>CPF</th>
            <th>Última sessão</th>
            <th>Protocolo</th>
            <th>Sessões</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.cpf}>
              <td><Avatar initials={p.name.split(' ').map(n=>n[0]).slice(0,2).join('')} size={32} tone={p.tone}/></td>
              <td className="fz-table-strong">{p.name}</td>
              <td className="fz-table-mono">{p.cpf}</td>
              <td className="tabular-nums">{p.last}</td>
              <td>{p.protocol}</td>
              <td className="tabular-nums">{p.sessions}</td>
              <td>{statusBadge[p.status]}</td>
              <td><button className="fz-iconbtn" aria-label="ações"><Icon name="more-horizontal" size={14}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

window.PatientList = PatientList;
