import { Home, History, Printer, Settings, TestTube2 } from 'lucide-react';

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
  onChange: (page: PageId) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">GP</div>
        <div>
          <strong>GasPrint</strong>
          <span>Local bridge</span>
        </div>
      </div>
      <nav className="nav-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={active === item.id ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => onChange(item.id)}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}