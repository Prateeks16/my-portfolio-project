import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import './index.css';
import { AuthProvider, RequireAuth } from './lib/auth';
import Portfolio from './portfolio/Portfolio';

/**
 * The portfolio is the surface recruiters load, so it ships eagerly and alone.
 * Everything behind the login — including the charting library — is split out
 * and only fetched once someone actually opens the dashboard.
 */
const DashboardLayout = lazy(() => import('./dashboard/DashboardLayout'));
const Login = lazy(() => import('./dashboard/Login'));
const Overview = lazy(() => import('./dashboard/pages/Overview'));
const Analytics = lazy(() => import('./dashboard/pages/Analytics'));
const Leads = lazy(() => import('./dashboard/pages/Leads'));
const LeadDetail = lazy(() => import('./dashboard/pages/LeadDetail'));
const Inbox = lazy(() => import('./dashboard/pages/Inbox'));
const Outreach = lazy(() => import('./dashboard/pages/Outreach'));
const Compose = lazy(() => import('./dashboard/pages/Compose'));
const Templates = lazy(() => import('./dashboard/pages/Templates'));
const Tasks = lazy(() => import('./dashboard/pages/Tasks'));
const Content = lazy(() => import('./dashboard/pages/Content'));
const GitHubPage = lazy(() => import('./dashboard/pages/GitHubPage'));
const Settings = lazy(() => import('./dashboard/pages/Settings'));

const RouteFallback = () => (
  <div className="min-h-screen bg-paper-app p-8">
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="skeleton h-8 w-56" />
      <div className="skeleton h-4 w-80" />
      <div className="skeleton h-64 w-full rounded-panel" />
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Portfolio />} />

            <Route path="/dashboard/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Overview />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="leads" element={<Leads />} />
              <Route path="leads/:id" element={<LeadDetail />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="outreach" element={<Outreach />} />
              <Route path="outreach/compose" element={<Compose />} />
              <Route path="templates" element={<Templates />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="content" element={<Content />} />
              <Route path="github" element={<GitHubPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
