/**
 * The content files (solutions, traces, theory) are several megabytes of JSON.
 *
 * With `resolveJsonModule` on, TypeScript parses each one and infers a full literal
 * type for it — every question title becomes a key, every code string a string
 * literal — which pushed a cold `tsc -b` past two minutes. Nothing benefits from
 * that work: every import site immediately casts (`as any`, `as unknown as T`)
 * because the real shapes are declared as interfaces in the same file.
 *
 * Declaring the modules broadly gives back the build time at no cost. The data's
 * actual shape is enforced far more strictly than TS could anyway, by the Python
 * validators that execute the code and check every trace against it before merge.
 */
declare module '*.json' {
  const value: any;
  export default value;
}
