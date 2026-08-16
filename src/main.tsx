import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { applyTheme, readTheme } from './components/ThemeToggle.tsx'
import { initMotionSystem } from './utils/motion.ts'
import { applySavedUiPrefs } from './utils/uiPrefs.ts'
import { applySavedDensity } from './utils/density.ts'
import { applySavedStudyModes } from './utils/studyModes.ts'
import { showUpdateToast } from './utils/pwaToast.ts'

// Stamp the saved theme before the first paint — reading it after render would
// flash the wrong palette for a frame on every load.
applyTheme(readTheme())

// One delegated motion system animates the whole app — scroll reveals, tilt,
// magnetism, ripples, count-ups — and no-ops entirely under reduced motion.
initMotionSystem()
// Display prefs (text scale, font, contrast, motion) stamp the same pre-paint
// way for the same reason — applying after render would flash the defaults.
applySavedUiPrefs()
// Density (compact layout) stamps the same pre-paint way — a late stamp would
// visibly reflow every card a frame after load.
applySavedDensity()
// Blind mode stamps data-blind the same pre-paint way — difficulty badges must
// not flash for a frame before the CSS hides them.
applySavedStudyModes()

// Service worker: precaches the app shell so the site opens with no network. On a
// new deploy the fresh worker waits until the learner opts in via the toast.
const updateSW = registerSW({
  onNeedRefresh: () => showUpdateToast(() => void updateSW(true)),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
