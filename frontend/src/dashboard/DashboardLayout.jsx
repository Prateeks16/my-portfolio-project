import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  CheckSquare,
  FileText,
  Github,
  Inbox,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Send,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { prefetch } from '../lib/useApi';
import { cx, initials } from '../lib/format';

// `chunk` pulls the lazy route bundle and `data` warms its first request, both
// on hover. By the time the click lands there is usually nothing left to wait for.
const NAV = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: LayoutGrid,
    end: true,
    chunk: () => import('./pages/Overview'),
    data: ['/crm/summary/', '/crm/leads/', '/crm/emails/?status=draft'],
  },
  {
    to: '/dashboard/leads',
    label: 'Leads',
    icon: Users,
    chunk: () => import('./pages/Leads'),
    data: ['/crm/leads/'],
  },
  {
    to: '/dashboard/outreach',
    label: 'Outreach',
    icon: Send,
    chunk: () => import('./pages/Outreach'),
    data: ['/crm/emails/', '/crm/emails/mail_status/'],
  },
  {
    to: '/dashboard/templates',
    label: 'Templates',
    icon: Mail,
    chunk: () => import('./pages/Templates'),
    data: ['/crm/templates/'],
  },
  {
    to: '/dashboard/inbox',
    label: 'Inbox',
    icon: Inbox,
    chunk: () => import('./pages/Inbox'),
    data: ['/crm/inbox/'],
  },
  {
    to: '/dashboard/tasks',
    label: 'Tasks',
    icon: CheckSquare,
    chunk: () => import('./pages/Tasks'),
    data: ['/crm/tasks/', '/crm/leads/'],
  },
  {
    to: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart3,
    chunk: () => import('./pages/Analytics'),
    data: ['/crm/analytics/?days=30'],
  },
  {
    to: '/dashboard/content',
    label: 'Content',
    icon: FileText,
    chunk: () => import('./pages/Content'),
    data: ['/crm/manage/profile/'],
  },
  {
    to: '/dashboard/github',
    label: 'GitHub',
    icon: Github,
    chunk: () => import('./pages/GitHubPage'),
    data: ['/crm/github/'],
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    chunk: () => import('./pages/Settings'),
    data: ['/crm/emails/mail_status/'],
  },
];

const warm = (entry) => {
  entry.chunk?.().catch(() => {});
  entry.data?.forEach(prefetch);
};

const DashboardLayout = () => {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    navigate('/dashboard/login', { replace: true });
  };

  const sidebar = (
    <div className="surface-ink flex h-full flex-col bg-ink-panel">
      <div className="border-b border-white/[0.08] px-5 py-[1.15rem]">
        {/* The one place Playfair appears in the CRM: the wordmark. */}
        <p className="heading-serif text-[1.0625rem] font-semibold text-white">
          Prateek Sahu
        </p>
        <p className="mt-0.5 text-micro font-semibold uppercase text-white/55">
          Portfolio CRM
        </p>
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3.5">
        {NAV.map((entry) => {
          const { to, label, icon: Icon, end } = entry;
          return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onMouseEnter={() => warm(entry)}
            onFocus={() => warm(entry)}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-control px-3 py-2 text-body font-medium',
                'transition-colors duration-150 ease-out',
                isActive
                  ? 'bg-white text-ink'
                  : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.25 : 1.9} />
                {label}
              </>
            )}
          </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-2.5">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={() => setDrawerOpen(false)}
          className="mb-1 flex items-center gap-3 rounded-control px-3 py-2 text-body font-medium text-white/55 transition-colors duration-150 hover:bg-white/[0.07] hover:text-white"
        >
          <ArrowUpRight size={16} strokeWidth={1.9} />
          View live site
        </a>
        <div className="flex items-center gap-2.5 rounded-control px-3 py-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-micro font-bold text-white"
          >
            {initials(username || 'Prateek Sahu')}
          </span>
          <span className="min-w-0 flex-1 truncate text-body text-white/70">
            {username || 'admin'}
          </span>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-control p-1.5 text-white/45 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper-app">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15rem] lg:block">
        {sidebar}
      </aside>

      {drawerOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-ink/45"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[15rem] animate-fadeIn shadow-over">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-[15rem]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper-app/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <button
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={drawerOpen}
            className="rounded-control border border-line-strong bg-surface p-2 text-ink transition-colors duration-150 hover:bg-surface-sunk"
          >
            {drawerOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <span className="heading-serif text-body font-semibold text-ink">
            Portfolio CRM
          </span>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
