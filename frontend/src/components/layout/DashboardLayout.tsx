import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Bell,
  History,
  Info,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analytics', label: 'Health Analytics', icon: BarChart3 },
  { path: '/live', label: 'Live Monitoring', icon: Activity },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/history', label: 'Battery History', icon: History },
  { path: '/about', label: 'About Project', icon: Info },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  selectedBattery: string;
  onBatteryChange: (id: string) => void;
  batteryIds: string[];
}

export default function DashboardLayout({
  children,
  onLogout,
  selectedBattery,
  onBatteryChange,
  batteryIds,
}: DashboardLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentItem = navItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-base-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-shrink-0 transform border-r border-base-700/50 bg-base-850 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-base-700/50">
            <Logo size="md" />
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Monitoring
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : 'text-slate-400 hover:bg-base-700/40 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Battery selector */}
          <div className="px-3 py-3 border-t border-base-700/50">
            <div className="flex items-center gap-2 px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              <Zap size={10} className="text-primary-400" />
              Active Battery
            </div>
            <select
              value={selectedBattery}
              onChange={(e) => onBatteryChange(e.target.value)}
              className="w-full rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-sm text-slate-200 outline-none transition-colors focus:border-primary-500/50"
            >
              {batteryIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-base-700/50">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-danger-500/10 hover:text-danger-400"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-base-700/50 bg-base-900/80 px-4 py-3.5 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-slate-200"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-slate-100 lg:text-lg">
                {currentItem?.label || 'Dashboard'}
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                AI-Based Intelligent EV Battery Health Monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-base-700 bg-base-800 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-400">System Online</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary-500/20 bg-primary-500/5 px-3 py-1.5">
              <Zap size={14} className="text-primary-400" />
              <span className="font-mono text-xs font-medium text-primary-400">
                {selectedBattery}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
