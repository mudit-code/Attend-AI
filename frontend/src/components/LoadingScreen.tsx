interface LoadingScreenProps {
  message?: string;
  fade?: boolean;
}

export default function LoadingScreen({ message = 'Loading AttendAI...', fade = false }: LoadingScreenProps) {
  return (
    <div
      className="attendai-loader-container"
      style={{
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? 'none' : 'all',
        transition: 'opacity 0.35s ease',
      }}
      aria-label="Loading AttendAI"
      role="status"
    >
      <div className="attendai-loader-emblem">
        <div className="attendai-loader-pulse-ring" />
        <div className="attendai-loader-icon">a</div>
      </div>

      <div className="attendai-loader-title">AttendAI</div>
      <div className="attendai-loader-subtitle">Smart Attendance System</div>

      <div className="attendai-loader-track">
        <div className="attendai-loader-bar" />
      </div>

      {message && <div className="attendai-loader-msg">{message}</div>}
    </div>
  );
}
