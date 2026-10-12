import { useState } from 'react';

interface UpdateBannerProps {
  onRefresh: () => void;
}

export default function UpdateBanner({ onRefresh }: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="update-banner" role="alert">
      <span>🔄 New update available!</span>
      <div className="flex gap-1">
        <button
          className="btn btn--sm"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
          onClick={() => setDismissed(true)}
        >
          Later
        </button>
        <button
          className="btn btn--sm"
          style={{ background: 'white', color: 'var(--color-primary)' }}
          onClick={onRefresh}
          id="update-refresh-btn"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}
