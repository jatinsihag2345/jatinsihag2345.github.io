# MAANG Prep Hub

This project is a Vite + React + TypeScript interview preparation workspace focused on two tracks:

- DSA SDE Sheet practice with topic theory, structured problem walkthroughs, Python solutions, and guided dry runs.
- SQL Top 50 preparation with schema previews, expected outputs, theory modules, and worked query approaches.

## Product Scope

- Dashboard with progress, streak, and bookmark summaries.
- DSA hub with topic filters, theory tabs, prerequisites, follow-ups, edge cases, and an interactive dry-run simulator.
- SQL hub with topic filters, theory accordions, example tables, query explanations, and a notes scratchpad.
- Local persistence for solved/bookmarked items, notes, and manual dry-run tables through `localStorage`.

## Repository Structure

- `src/App.tsx`: app shell, navigation, and persisted study progress.
- `src/components/`: dashboard, hubs, viewers, sidebar, syntax highlighting, and dry-run simulator.
- `src/data/`: curated DSA/SQL questions plus generated theory, solutions, and trace datasets.
- `scratch/`: generator scripts, extraction utilities, and intermediate JSON batches used to assemble the content corpus.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Notes

- `src/App.css` is legacy Vite starter CSS and is not part of the live UI.
- The source of truth for the current product is the React app under `src/`, not older dream-journal references from previous project iterations.
