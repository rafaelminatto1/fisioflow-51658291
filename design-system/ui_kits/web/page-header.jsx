// PageHeader — top bar for FisioFlow pages
const { Icon, Button, Avatar } = window.FZ;

const PageHeader = ({ title, meta, actions, alert }) => (
  <header className="fz-pageheader">
    <div className="fz-pageheader-top">
      <div className="fz-pageheader-live"><span className="dot" /> REAL-TIME ACTIVE</div>
      <div className="fz-pageheader-right">
        <div className="fz-pageheader-search"><Icon name="search" size={14}/> Buscar <kbd>⌘K</kbd></div>
        <button className="fz-iconbtn" aria-label="notificações"><Icon name="bell" size={16}/></button>
        <div className="fz-pageheader-online"><span className="dot online" /> 0 online</div>
        <button className="fz-iconbtn" aria-label="modo escuro"><Icon name="moon" size={16}/></button>
        <div className="fz-pageheader-user">
          <Avatar initials="RM" size={32} tone="blue" />
          <div className="fz-pageheader-user-name">
            <div>RAFAEL MINATTO</div>
            <div className="eyebrow">ADMIN</div>
          </div>
          <Icon name="chevron-down" size={14}/>
        </div>
      </div>
    </div>
    <div className="fz-pageheader-main">
      <div className="fz-pageheader-title">
        <h1>{title}</h1>
        {meta && <div className="fz-pageheader-meta">{meta}</div>}
        {alert && (
          <div className="fz-pageheader-alert">
            <Icon name="alert-triangle" size={14} /> {alert}
          </div>
        )}
      </div>
      <div className="fz-pageheader-actions">{actions}</div>
    </div>
  </header>
);

window.PageHeader = PageHeader;
