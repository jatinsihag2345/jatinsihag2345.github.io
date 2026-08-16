/**
 * The "new version" prompt for the service worker. Plain DOM on purpose: it is
 * triggered from main.tsx, outside the React tree, and a stale-bundle notice must
 * not depend on the (possibly stale) bundle's component tree to render.
 */
export const showUpdateToast = (reload: () => void) => {
  if (document.getElementById('pwa-update-toast')) return; // one prompt at a time

  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  // role=status is announced by screen readers without stealing focus — an update
  // notice never justifies interrupting someone mid-problem.
  toast.setAttribute('role', 'status');
  toast.className = 'glass animate-in';
  toast.style.cssText = [
    'position:fixed', 'bottom:1rem', 'right:1rem', 'z-index:200',
    'display:flex', 'align-items:center', 'gap:0.75rem', 'flex-wrap:wrap',
    'padding:0.75rem 1rem', 'border-radius:12px',
    'border:1px solid hsl(var(--border-color))',
    'box-shadow:0 8px 24px hsl(var(--primary) / 0.25)',
    'max-width:min(92vw, 380px)',
  ].join(';');

  const message = document.createElement('span');
  message.textContent = 'New version — reload';
  message.style.cssText = 'font-size:0.85rem;font-weight:600;color:hsl(var(--text-primary))';

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.className = 'btn btn-primary';
  reloadBtn.style.cssText = 'padding:0.45rem 0.9rem;font-size:0.8rem';
  reloadBtn.textContent = 'Reload';
  reloadBtn.onclick = reload;

  const laterBtn = document.createElement('button');
  laterBtn.type = 'button';
  laterBtn.className = 'btn btn-secondary';
  laterBtn.style.cssText = 'padding:0.45rem 0.9rem;font-size:0.8rem';
  laterBtn.textContent = 'Later';
  // "Later" is a real choice: the old version keeps working (it is fully precached),
  // and the new one installs itself on the next natural reload anyway.
  laterBtn.onclick = () => toast.remove();

  toast.append(message, reloadBtn, laterBtn);
  document.body.appendChild(toast);
};
