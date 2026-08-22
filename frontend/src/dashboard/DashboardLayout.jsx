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
  Send,
  Settings,
  Users,
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

  // The rail is a detached glass slab, not a wall welded to the viewport edge.
  const sidebar = (
    <div className="flex h-full flex-col overflow-hidden rounded-shell border border-white/[0.07] bg-white/[0.03] backdrop-blur-2xl">
      <div className="border-b border-white/[0.06] px-5 py-[1.15rem]">
        <p className="display-face text-[1.0625rem] font-semibold text-ink">
          Prateek Sahu
        </p>
        <p className="mt-1 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary">
          Portfolio CRM
        </p>
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
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
                  'flex items-center gap-3 rounded-full px-3.5 py-2 text-body font-medium',
                  'transition-all duration-500 ease-fluid',
                  isActive
                    ? 'bg-ink text-on-accent shadow-[0_12px_30px_-16px_rgba(255,255,255,0.6)]'
                    : 'text-ink-secondary hover:bg-white/[0.07] hover:text-ink'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-2.5">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={() => setDrawerOpen(false)}
          className="group mb-1 flex items-center justify-between gap-3 rounded-full px-3.5 py-2 text-body font-medium text-ink-secondary transition-all duration-500 ease-fluid hover:bg-white/[0.07] hover:text-ink"
        >
          View live site
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.07] transition-all duration-700 ease-fluid group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105 group-hover:bg-white/[0.14]"
          >
            <ArrowUpRight size={13} />
          </span>
        </a>
        <div className="flex items-center gap-2.5 rounded-full px-3.5 py-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-micro font-bold text-ink"
          >
            {initials(username || 'Prateek Sahu')}
          </span>
          <span className="min-w-0 flex-1 truncate text-body text-ink-secondary">
            {username || 'admin'}
          </span>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-tertiary transition-all duration-500 ease-fluid hover:bg-white/[0.1] hover:text-ink"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-paper-app">
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[15rem] lg:block">
        {sidebar}
      </aside>

      {/* Kept mounted so the drawer interpolates out as well as in. */}
      <div className="lg:hidden" aria-hidden={!drawerOpen}>
        <div
          className={cx(
            'fixed inset-0 z-40 bg-black/70 backdrop-blur-2xl transition-opacity duration-700 ease-fluid',
            drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={cx(
            'fixed inset-y-3 left-3 z-50 w-[15rem] transition-transform duration-700 ease-fluid',
            drawerOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-[110%]'
          )}
        >
          {sidebar}
        </aside>
      </div>

      <div className="lg:pl-[16rem]">
        <header className="sticky top-0 z-20 px-3 pt-3 lg:hidden">
          <div className="flex items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.05] py-2 pl-2 pr-5 backdrop-blur-2xl">
            <button
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={drawerOpen}
              className="relative h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/[0.06] transition-colors duration-500 ease-fluid hover:bg-white/[0.12]"
            >
              {/* Two lines folding into an X, never an icon swap. */}
              <span
                aria-hidden="true"
                className={cx(
                  'absolute left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-all duration-500 ease-fluid',
                  drawerOpen ? 'top-1/2 rotate-45' : 'top-[15px]'
                )}
              />
              <span
                aria-hidden="true"
                className={cx(
                  'absolute left-1/2 h-px w-4 -translate-x-1/2 bg-ink transition-all duration-500 ease-fluid',
                  drawerOpen ? 'top-1/2 -rotate-45' : 'top-[21px]'
                )}
              />
            </button>
            <span className="display-face text-body font-semibold text-ink">
              Portfolio CRM
            </span>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
