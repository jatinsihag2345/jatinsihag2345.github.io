/**
 * Core CS content registry — the one place the seven theory JSONs meet the app.
 *
 * Lands at: src/data/coreSubjects.ts  (JSON content files land at src/data/core/*.json)
 *
 * The JSON shape is enforced by the Python gate (validate_core.py) before merge —
 * section/answer/card minimums, and every embedded code block actually executed.
 * json-modules.d.ts declares all JSON imports as `any` on purpose (literal-typing
 * multi-MB content files cost minutes per cold build), so the interfaces below are
 * the compiler's only view of the data, and `load()` is the single cast site.
 */
import oopJson from './core/oop.json';
import osJson from './core/os.json';
import dbmsJson from './core/dbms.json';
import cnJson from './core/cn.json';
import lldJson from './core/lld.json';
import hldBlocksJson from './core/hld-blocks.json';
import hldCasesJson from './core/hld-cases.json';
import behavioralJson from './core/behavioral.json';
import idiomsJson from './core/idioms.json';

export interface CoreSection {
  title: string;
  /** Prose; may embed ```fenced ASCII diagrams``` — render fences as <pre>,
   *  exactly like DSAHub's theory view. */
  content: string;
  /** Optional Python, already executed (with its asserts) by the validator. */
  code?: string;
}

export interface CoreInterviewQA {
  q: string;
  a: string;
  followUps: string[];
}

/**
 * ORDER IS IDENTITY for flashcards: review ids are `core-<subjectId>-card-<index>`,
 * so a learner's grades live against the card's position in this array. Content
 * updates must APPEND new cards, never reorder or delete existing ones — otherwise
 * every grade after the edit point silently attaches to the wrong card.
 */
export interface CoreFlashcard {
  front: string;
  back: string;
}

export interface CoreSubjectContent {
  subject: string;
  summary: string;
  sections: CoreSection[];
  interviewQA: CoreInterviewQA[];
  flashcards: CoreFlashcard[];
}

export interface CoreSubject extends CoreSubjectContent {
  /** Stable id. Flashcard review ids (`core-<id>-card-<index>`) are built from it
   *  and persist in the shared reviewSchedule — renaming an id orphans every grade
   *  a learner has recorded for that subject. Never rename; add new ids instead. */
  id: string;
  /** Short label for the pill row; `subject` from the JSON stays the long title. */
  label: string;
}

// The single place `any` (see json-modules.d.ts) is pinned to the real interfaces.
const load = (id: string, label: string, raw: CoreSubjectContent): CoreSubject => ({
  id,
  label,
  ...raw,
});

/**
 * Study order, not alphabetical order: OOP first because its vocabulary is what LLD
 * answers are graded in; then the classic screening trio (OS, DBMS, CN) that phone
 * screens actually ask; LLD once OOP is in hand; and the HLD pair last — building
 * blocks before case studies, because a case study is just blocks composed under
 * constraints.
 */
export const coreSubjects: CoreSubject[] = [
  load('oop', 'OOP', oopJson),
  load('os', 'OS', osJson),
  load('dbms', 'DBMS', dbmsJson),
  load('cn', 'Networks', cnJson),
  load('lld', 'LLD', lldJson),
  load('hld-blocks', 'HLD Blocks', hldBlocksJson),
  load('hld-cases', 'HLD Cases', hldCasesJson),
  // Appended last: behavioral stories and Python idioms are cross-cutting prep,
  // studied alongside (not before) the technical subjects above. CoreHub is fully
  // data-driven, so registration here is the whole integration.
  load('behavioral', 'Behavioral', behavioralJson),
  load('idioms', 'Py Idioms', idiomsJson),
];
