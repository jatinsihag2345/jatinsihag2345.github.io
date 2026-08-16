import React from 'react';
import { CoreHub } from './CoreHub';
import { devopsSubjects } from '../data/devopsSubjects';

/**
 * DevOps study hub.
 *
 * Intentionally four lines: CoreHub already is this screen — subject pills,
 * sections, interview Q&A, a spaced-repetition deck, print, read-aloud — and it
 * takes the subject list and the review-id prefix as props. Duplicating it would
 * mean every future fix to one hub silently not reaching the other.
 *
 * `idPrefix="devops"` keeps this hub's flashcard grades in their own namespace in
 * the shared review ledger, so a DevOps card and a Core CS card with the same
 * index can never overwrite each other's schedule.
 */
export const DevOpsHub: React.FC = () => (
  <CoreHub
    subjects={devopsSubjects}
    idPrefix="devops"
    heading={<>Dev<span className="gradient-text">Ops</span></>}
    blurb="Linux, Git, networking, containers, Kubernetes and pipelines — how the machinery under a deployed service actually works, with the interview questions and flashcards to match."
  />
);
