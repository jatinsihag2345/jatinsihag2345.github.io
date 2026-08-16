/**
 * In-browser Java compile + run, via CheerpJ (a WebAssembly JVM).
 *
 * Unlike pythonRunner.ts (Pyodide), nothing here is a language runtime we control:
 * CheerpJ is a real JVM that must be loaded from Leaning Technologies' CDN — their
 * Community License forbids self-hosting the runtime — and `javac` is not part of
 * it. The compiler is OpenJDK's own `tools.jar`, served from our public/ folder and
 * run as an ordinary Java program inside the JVM, exactly as Leaning Technologies'
 * own JavaFiddle demo does it.
 *
 * The awkward part is output. `cheerpjRunMain` resolves to an exit code, never to
 * the program's text, because CheerpJ writes stdout/stderr straight into a DOM node
 * with id="console". So capturing output means owning that node: we create it once,
 * clear it before each run, and read `innerText` back afterwards. It is deliberately
 * kept off-screen rather than `display:none` — CheerpJ writes into it either way,
 * but a `display:none` subtree is not guaranteed to expose innerText.
 */

const CHEERPJ_LOADER = 'https://cjrtnc.leaningtech.com/4.3/loader.js';
/** OpenJDK's javac, vendored from leaningtech/javafiddle (Apache-2.0). */
const TOOLS_JAR = '/java-runtime/tools.jar';
const CONSOLE_ID = 'console';
/** CheerpJ's writable-from-JS mount for source we hand it. */
const SRC_DIR = '/str';
/** Writable scratch mount where javac drops .class files. */
const OUT_DIR = '/files';

declare global {
  interface Window {
    cheerpjInit?: (opts?: Record<string, unknown>) => Promise<void>;
    cheerpjRunMain?: (className: string, classPath: string, ...args: string[]) => Promise<number>;
    cheerpjAddStringFile?: (path: string, data: Uint8Array | string) => void;
    cheerpOSAddStringFile?: (path: string, data: Uint8Array | string) => void;
  }
}

export interface JavaRunResult {
  ok: boolean;
  stdout: string;
  error?: string;
  /** Set only when the caller supplied `expect`; mirrors PyRunResult's shape. */
  passed?: boolean;
  failedAssertion?: string;
  elapsedMs: number;
}

type ProgressCb = (msg: string) => void;
let progressCb: ProgressCb | null = null;
export const onJavaProgress = (cb: ProgressCb): void => { progressCb = cb; };
const report = (msg: string) => progressCb?.(msg);

let ready: Promise<void> | null = null;
let consoleEl: HTMLElement | null = null;

export const isJavaReady = (): boolean => ready !== null && cheerpjBooted;
let cheerpjBooted = false;

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === '1') resolve();
      else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('CheerpJ failed to load')));
      }
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.addEventListener('load', () => { el.dataset.loaded = '1'; resolve(); });
    el.addEventListener('error', () => reject(new Error('CheerpJ failed to load')));
    document.head.appendChild(el);
  });

/** The node CheerpJ writes stdout/stderr into. Off-screen, not display:none. */
const ensureConsole = (): HTMLElement => {
  if (consoleEl && document.body.contains(consoleEl)) return consoleEl;
  let el = document.getElementById(CONSOLE_ID);
  if (!el) {
    el = document.createElement('pre');
    el.id = CONSOLE_ID;
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, {
      position: 'absolute', left: '-9999px', top: '0',
      width: '1200px', height: '1px', overflow: 'hidden',
      whiteSpace: 'pre-wrap',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);
  }
  consoleEl = el;
  return el;
};

/** Loads the CDN runtime and boots the JVM. Idempotent — the promise is cached. */
export const loadJava = (): Promise<void> => {
  if (ready) return ready;
  ready = (async () => {
    report('Loading the Java runtime (about 20 MB, one time)…');
    await loadScript(CHEERPJ_LOADER);
    if (!window.cheerpjInit) throw new Error('CheerpJ loaded but cheerpjInit is missing');
    ensureConsole();
    // status:'none' suppresses CheerpJ's own floating progress widget — this app
    // reports progress through its own UI.
    await window.cheerpjInit({ status: 'none' });
    cheerpjBooted = true;
    report('');
  })().catch(err => {
    ready = null; // a failed boot must not poison every later attempt
    cheerpjBooted = false;
    throw err;
  });
  return ready;
};

/** CheerpJ renamed this between versions; the 4.3 loader still ships the old name. */
const writeFile = (path: string, contents: string): void => {
  const bytes = new TextEncoder().encode(contents);
  const write = window.cheerpOSAddStringFile ?? window.cheerpjAddStringFile;
  if (!write) throw new Error('CheerpJ exposes no file-write API');
  write(path, bytes);
};

/** `public class Foo` (or plain `class Foo`) decides the .java filename javac demands. */
export const detectPublicClass = (source: string): string => {
  const pub = /(?:^|\n)\s*public\s+(?:final\s+|abstract\s+)?class\s+([A-Za-z_]\w*)/.exec(source);
  if (pub) return pub[1];
  const any = /(?:^|\n)\s*(?:final\s+|abstract\s+)?class\s+([A-Za-z_]\w*)/.exec(source);
  return any ? any[1] : 'Main';
};

const hasMain = (source: string): boolean =>
  /static\s+void\s+main\s*\(\s*String\s*(?:\[\s*\]\s*\w+|\w+\s*\[\s*\])\s*\)/.test(source);

/**
 * Compile and run one self-contained Java source.
 *
 * `expect`, when given, is compared against trimmed stdout — the Java track has no
 * assertion harness like Python's, so "did it print the right thing" is the honest
 * check available, and the result shape mirrors PyRunResult so the same UI consumes
 * both.
 */
export const runJava = async (source: string, expect?: string): Promise<JavaRunResult> => {
  const started = Date.now();
  const fail = (error: string): JavaRunResult => ({
    ok: false, stdout: '', error, elapsedMs: Date.now() - started,
  });

  if (!hasMain(source)) {
    return fail(
      'No entry point found. Java runs from `public static void main(String[] args)` — ' +
      'add one that calls your method and prints the result.',
    );
  }

  try {
    await loadJava();
  } catch {
    return fail(
      'The Java runtime could not be loaded. It is fetched from CheerpJ\'s CDN, so this ' +
      'usually means no connection — Python still runs fully offline.',
    );
  }

  const className = detectPublicClass(source);
  const srcPath = `${SRC_DIR}/${className}.java`;
  const classPath = `/app${TOOLS_JAR}:${OUT_DIR}/`;
  const el = ensureConsole();

  try {
    writeFile(srcPath, source);

    report('Compiling…');
    el.innerText = '';
    const compileExit = await window.cheerpjRunMain!(
      'com.sun.tools.javac.Main', classPath, srcPath, '-d', `${OUT_DIR}/`, '-nowarn',
    );
    const compileOut = el.innerText.trim();
    if (compileExit !== 0) {
      report('');
      return {
        ok: false,
        stdout: '',
        error: compileOut || `javac exited with code ${compileExit}.`,
        elapsedMs: Date.now() - started,
      };
    }

    report('Running…');
    el.innerText = '';
    const runExit = await window.cheerpjRunMain!(className, classPath);
    const stdout = el.innerText.replace(/\s+$/, '');
    report('');

    // An uncaught exception does NOT give a non-zero exit code here (verified: the
    // JVM runs main on its own thread, so a throw kills that thread while CheerpJ
    // still reports 0). The stack trace on stderr is the only reliable signal, so
    // detect it in the text rather than trusting the exit code alone.
    const threw = /^(?:Exception in thread |[\w.$]*(?:Exception|Error)(?::|\s*\n\tat ))/m.test(stdout);
    if (runExit !== 0 || threw) {
      return {
        ok: false, stdout: '',
        error: stdout || `Program exited with code ${runExit}.`,
        elapsedMs: Date.now() - started,
      };
    }

    const result: JavaRunResult = { ok: true, stdout, elapsedMs: Date.now() - started };
    if (expect !== undefined) {
      const got = stdout.trim();
      const want = expect.trim();
      result.passed = got === want;
      if (!result.passed) result.failedAssertion = `Expected:\n${want}\n\nGot:\n${got || '(no output)'}`;
    }
    return result;
  } catch (err) {
    report('');
    return fail(err instanceof Error ? err.message : String(err));
  }
};
