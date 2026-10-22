import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  MessageSquarePlus,
  FileBarChart,
  FilePenLine,
  Mic,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import Logo from './Logo';
import UserAvatar from './UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'New Conversation', icon: MessageSquarePlus },
  { to: '/summaries', label: 'Summaries', icon: FileBarChart },
  { to: '/drafts', label: 'Drafts', icon: FilePenLine },
  { to: '/voice', label: 'Voice Consultation', icon: Mic },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft border border-ink-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-ink-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-ink-100 bg-white transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-ink-100">
          <Logo to="/dashboard" />
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            Workspace
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={closeMobile}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                    )}
                  >
                    <item.icon
                      className={cn('h-[18px] w-[18px]', isActive ? 'text-brand-600' : 'text-ink-400')}
                      strokeWidth={2}
                    />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Disclaimer mini */}
        <div className="px-4 pb-3">
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-[11px] leading-relaxed text-ink-400">
            LegalGenie provides general legal information only and is not a substitute for
            professional legal advice.
          </p>
        </div>

        {/* Profile */}
        <div className="relative border-t border-ink-100 p-3">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ink-50"
          >
            <UserAvatar name={user?.name ?? 'User'} size="sm" />
            <div className="flex-1 text-left">
              <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
              <p className="truncate text-xs text-ink-400">{user?.organisation}</p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <div className="absolute bottom-20 left-3 right-3 z-10 animate-scale-in rounded-xl border border-ink-100 bg-white shadow-lift">
              <button
                onClick={() => {
                  navigate('/settings');
                  setProfileOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50 rounded-t-xl"
              >
                <Settings className="h-4 w-4 text-ink-400" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-error-600 hover:bg-error-50 rounded-b-xl"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
