import React from 'react';
import { ExternalLink, GitFork, Github, Star } from 'lucide-react';
import { useApi } from '../../lib/useApi';
import { relativeTime } from '../../lib/format';
import {
  EmptyState,
  ErrorNote,
  LoadingPanel,
  Panel,
  PanelHeader,
  PageHeading,
  SummaryLine,
} from '../components/ui';

const GitHubPage = () => {
  const { data, loading, error, refetch } = useApi('/crm/github/');

  return (
    <>
      <PageHeading
        title="GitHub"
        description="Live from the GitHub API — useful when you want to point a recruiter at something recent."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote onRetry={refetch}>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Panel>
          <LoadingPanel rows={6} label="Loading GitHub activity" />
        </Panel>
      ) : data?.error ? (
        <Panel>
          <EmptyState
            icon={Github}
            title="Could not reach GitHub"
            message={`The API returned: ${data.error}. This is usually rate limiting — it clears on its own within the hour.`}
          />
        </Panel>
      ) : (
        data && (
          <div className="space-y-5">
            <SummaryLine
              items={[
                { value: data.totals.owned_repos, label: 'own repositories' },
                { value: data.totals.forks, label: 'forks' },
                { value: data.totals.stars, label: 'stars' },
                { value: data.languages.length, label: 'languages' },
              ]}
            />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
              <Panel>
                <PanelHeader
                  title="Recent repositories"
                  meta="Most recently pushed first"
                />
                <ul className="divide-y divide-line">
                  {data.repos.map((repo) => (
                    <li key={repo.name} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-body font-semibold text-ink underline-offset-4 hover:underline"
                          >
                            {repo.name}
                            <ExternalLink size={12} className="text-ink-tertiary" />
                          </a>
                          {repo.description && (
                            <p className="mt-0.5 text-label leading-relaxed text-ink-secondary">
                              {repo.description}
                            </p>
                          )}
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-tertiary">
                            {repo.language && <span>{repo.language}</span>}
                            <span>pushed {relativeTime(repo.pushed_at)}</span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-label text-ink-tertiary">
                          <span className="tabular inline-flex items-center gap-1">
                            <Star size={12} /> {repo.stars}
                          </span>
                          <span className="tabular inline-flex items-center gap-1">
                            <GitFork size={12} /> {repo.forks}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel>
                <PanelHeader title="Languages" meta="By repository count" />
                <ul className="divide-y divide-line">
                  {data.languages.map((language) => {
                    const max = data.languages[0]?.count || 1;
                    return (
                      <li key={language.name} className="px-4 py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-body text-ink">{language.name}</span>
                          <span className="tabular text-label font-semibold text-ink">
                            {language.count}
                          </span>
                        </div>
                        <div
                          className="mt-1.5 h-1 rounded-full bg-ink/15"
                          style={{ width: `${(language.count / max) * 100}%` }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </div>
          </div>
        )
      )}
    </>
  );
};

export default GitHubPage;
