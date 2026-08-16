import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Outbound study links for a problem — constructed SEARCHES, not direct links,
 * because guessing a slug ("/problems/two-sum") breaks silently the day a site
 * renames it. The labels say "search" so nobody expects a deep link.
 *
 * Lands at: src/components/ResourceLinks.tsx  (rendered inside SimilarProblems' card)
 */

interface ResourceLinksProps {
  title: string;
}

export const ResourceLinks: React.FC<ResourceLinksProps> = ({ title }) => {
  // NeetCode and LeetCode Discuss expose no stable public search URL of their own,
  // so both go through a site-scoped web search — honest and rename-proof.
  const links = [
    {
      label: 'NeetCode (site search)',
      href: `https://www.google.com/search?q=${encodeURIComponent(`site:neetcode.io ${title}`)}`,
    },
    {
      label: 'YouTube search',
      href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} leetcode`)}`,
    },
    {
      label: 'LeetCode Discuss (site search)',
      href: `https://www.google.com/search?q=${encodeURIComponent(`site:leetcode.com/discuss ${title}`)}`,
    },
    {
      label: 'GeeksforGeeks',
      href: `https://www.google.com/search?q=${encodeURIComponent(`site:geeksforgeeks.org ${title}`)}`,
    },
    {
      label: 'InterviewBit',
      href: `https://www.google.com/search?q=${encodeURIComponent(`site:interviewbit.com ${title}`)}`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: 'hsl(var(--text-muted))' }}>
        STUDY THIS ELSEWHERE
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {links.map(l => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none',
            }}
          >
            <span>{l.label}</span>
            <ExternalLink size={11} />
          </a>
        ))}
      </div>
    </div>
  );
};
