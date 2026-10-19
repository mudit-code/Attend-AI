import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark'; // 'light' is dark text for white canvas; 'dark' is white text for dark sidebar
  showWordmark?: boolean;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  showWordmark = true,
  subtitle,
  onClick,
  className = '',
}) => {
  const dimensions = {
    sm: { box: 30, radius: 8, font: '1rem', dot: 3, text: '1.05rem', sub: '0.65rem' },
    md: { box: 36, radius: 10, font: '1.25rem', dot: 3.5, text: '1.25rem', sub: '0.7rem' },
    lg: { box: 44, radius: 12, font: '1.5rem', dot: 4, text: '1.5rem', sub: '0.8rem' },
  }[size];

  const textColor = variant === 'dark' ? '#FFFFFF' : '#0F172A';
  const subColor = variant === 'dark' ? '#94A3B8' : '#64748B';

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Trombone Amber Squircle Icon */}
      <div
        style={{
          width: dimensions.box,
          height: dimensions.box,
          minWidth: dimensions.box,
          borderRadius: dimensions.radius,
          background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0F172A',
          fontWeight: 900,
          fontSize: dimensions.font,
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          lineHeight: 1,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          position: 'relative',
        }}
      >
        <span style={{ transform: 'translateY(-1px)' }}>a</span>
        <span
          style={{
            position: 'absolute',
            top: size === 'sm' ? '4px' : '5px',
            right: size === 'sm' ? '4px' : '5px',
            width: dimensions.dot,
            height: dimensions.dot,
            borderRadius: '50%',
            background: '#0F172A',
          }}
        />
      </div>

      {/* Trombone Typography Wordmark */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: dimensions.text,
              color: textColor,
              letterSpacing: '-0.3px',
              lineHeight: 1.15,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span>attend</span>
            <span style={{ color: '#F59E0B' }}>.ai</span>
          </div>
          {subtitle && (
            <span
              style={{
                fontSize: dimensions.sub,
                color: subColor,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: '1px',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
