// FisioFlow Web UI Kit — primitives
const { useState } = React;

const Icon = ({ name, size = 16, className = '', style = {}, ...rest }) => (
  <i
    data-lucide={name}
    className={`fz-icon ${className}`}
    style={{ width: size, height: size, display: 'inline-flex', ...style }}
    {...rest}
  />
);

const Button = ({ variant='default', size='default', className='', children, ...rest }) => {
  const base = 'fz-btn';
  const variants = {
    default: 'fz-btn-primary',
    medical: 'fz-btn-medical',
    success: 'fz-btn-success',
    destructive: 'fz-btn-destructive',
    secondary: 'fz-btn-secondary',
    outline: 'fz-btn-outline',
    ghost: 'fz-btn-ghost',
    link: 'fz-btn-link',
  };
  const sizes = { sm: 'fz-btn-sm', default: '', lg: 'fz-btn-lg', icon: 'fz-btn-icon' };
  return <button className={`${base} ${variants[variant]||''} ${sizes[size]||''} ${className}`} {...rest}>{children}</button>;
};

const Badge = ({ variant='default', children, className='', ...rest }) => {
  const map = {
    default: 'fz-badge-default',
    secondary: 'fz-badge-secondary',
    destructive: 'fz-badge-destructive',
    outline: 'fz-badge-outline',
    success: 'fz-badge-success',
    warning: 'fz-badge-warning',
  };
  return <span className={`fz-badge ${map[variant]||''} ${className}`} {...rest}>{children}</span>;
};

const Input = (props) => <input className="fz-input" {...props} />;

const Card = ({ children, className='', ...rest }) => (
  <div className={`fz-card ${className}`} {...rest}>{children}</div>
);

const Avatar = ({ initials, size=36, tone='blue' }) => {
  const tones = {
    blue:  { bg: 'hsl(211 100% 92%)', fg: 'hsl(211 100% 30%)' },
    teal:  { bg: 'hsl(158 64% 92%)',  fg: 'hsl(158 64% 25%)' },
    gray:  { bg: 'hsl(220 14% 90%)',  fg: 'hsl(220 39% 11%)' },
    amber: { bg: 'hsl(45 93% 90%)',   fg: 'hsl(35 70% 25%)' },
  };
  const t = tones[tone] || tones.blue;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: t.bg, color: t.fg, display:'flex',
      alignItems:'center', justifyContent:'center',
      fontWeight:600, fontSize: size*0.34, flexShrink:0,
    }}>{initials}</div>
  );
};

window.FZ = { Icon, Button, Badge, Input, Card, Avatar };
