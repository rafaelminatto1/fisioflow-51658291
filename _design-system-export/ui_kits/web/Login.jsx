// Login screen for FisioFlow Clínica
const { Button } = window.FZ;

const Login = ({ onLogin }) => {
  const [email, setEmail] = React.useState('rafael@activityfisio.com.br');
  const [pwd, setPwd] = React.useState('••••••••••••');
  return (
    <div className="fz-login">
      <div className="fz-login-card">
        <img src="../../assets/activity-logo.svg" alt="Activity Fisioterapia" className="fz-login-logo"/>
        <h1>FisioFlow</h1>
        <div className="fz-login-sub">MOOCA FISIO · Acesso clínico</div>
        <label>E-mail</label>
        <input className="fz-input" value={email} onChange={e=>setEmail(e.target.value)} type="email"/>
        <label>Senha</label>
        <input className="fz-input" value={pwd} onChange={e=>setPwd(e.target.value)} type="password"/>
        <Button variant="default" className="fz-login-cta" onClick={onLogin}>Entrar</Button>
        <a className="fz-login-link" href="#">Esqueci minha senha</a>
      </div>
      <div className="fz-login-foot">v3.2.1 · LGPD · Edge Cloudflare</div>
    </div>
  );
};

window.Login = Login;
