import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Check if session previously dismissed
    if (sessionStorage.getItem('attendai_pwa_dismissed') === 'true') {
      setIsDismissed(true);
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(isIosDevice);

    // Capture Chrome/Android/Edge beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('AttendAI PWA was successfully installed.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIosGuide(!showIosGuide);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('attendai_pwa_dismissed', 'true');
  };

  // If already installed in standalone mode, or dismissed, or neither prompt nor iOS available, do not render
  if (isStandalone || isDismissed || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <aside aria-label="Install AttendAI App" className="pwa-install-banner" style={{ margin: '0.75rem 0' }}>
      <div className="pwa-install-banner__content">
        <div className="pwa-install-banner__badge">
          <span>a</span>
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text)' }}>
            Install AttendAI App
          </strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Fast 1-tap home screen access &amp; offline attendance mode
          </span>
          {showIosGuide && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.75rem',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              1. Tap <strong>Share</strong> button in Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen ⊞</strong>.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          className="btn btn--primary"
          style={{ minHeight: '36px', padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}
        >
          {isIOS ? 'Install Guide' : 'Install App'}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#A6A4B5',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          &times;
        </button>
      </div>
    </aside>
  );
}
