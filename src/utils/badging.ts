/**
 * App icon badge — the review queue's size, visible before the app is even open.
 *
 * An installed PWA's icon can carry a number (the Badging API). The one number
 * this app owes the learner at a glance is "how many reviews are due" — the same
 * count the DueReviewNudge toast nags about, but surfaced on the home screen or
 * dock, where "I'll check later" actually happens.
 *
 * Call sites (see App.tsx): on mount, on the 'review-changed' event that
 * utils/review.ts dispatches after every grade, and on visibilitychange —
 * "due" rolls over at midnight while the tab sleeps, so a stale badge would
 * otherwise survive until the next grade.
 */
import { dueQuestionIds } from './review';

export const updateAppBadge = () => {
  // Silent feature detection is the honest choice HERE specifically: in a plain
  // browser tab there is no app icon for a badge to live on, so there is no UI
  // to degrade and nothing truthful a fallback could say.
  if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
  const due = dueQuestionIds().length;
  // clearAppBadge for zero rather than setAppBadge(0): several platforms render
  // a zero badge as an empty dot, and "nothing due" should look like nothing.
  const call = due > 0 ? navigator.setAppBadge(due) : navigator.clearAppBadge();
  // The promise can reject (permission policy, the app uninstalled mid-session);
  // a badge is never worth an unhandled-rejection in the console.
  void call.catch(() => {});
};
