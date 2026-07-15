import { History, Home, PanelLeftClose, PanelLeftOpen, Printer, Settings, TestTube2 } from 'lucide-react';
import { GasPrintLogo, GasPrintMark } from './branding/GasPrintLogo';

export type PageId = 'home' | 'printers' | 'lab' | 'history' | 'settings';

const items: Array<{ id: PageId; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'printers', label: 'Impresoras', icon: Printer },
  { id: 'lab', label: 'Laboratorio', icon: TestTube2 },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'settings', label: 'Configuracion', icon: Settings }
];

interface SidebarProps {
  active: PageId;
  collapsed: boolean;
  onChange: (page: PageId) => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ active, collapsed, onChange, onToggleCollapse }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand">
          {collapsed ? <GasPrintMark size={38} /> : <GasPrintLogo height={30} />}
        </div>
        <button
          className="collapse-btn"
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Colapsar menu lateral'}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className="nav-list" aria-label="Navegacion principal">
        {!collapsed && <span className="nav-section-label">Navegacion</span>}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={active === item.id ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => onChange(item.id)}
              title={item.label}
              aria-current={active === item.id ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon size={19} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <span className="dot-line">
          <span className="status-dot good" />
          <span className="foot-detail">Local bridge</span>
        </span>
        <span className="foot-detail">127.0.0.1 &middot; solo escritorio</span>
      </div>
    </aside>
  );
}
