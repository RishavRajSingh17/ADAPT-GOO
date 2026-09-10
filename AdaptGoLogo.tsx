import React from 'react';

interface AdaptGoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'wordmark';
  showTagline?: boolean;
}

export const AdaptGoLogo: React.FC<AdaptGoLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  showTagline = false
}) => {
  // Height configurations
  const heightMap = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20'
  };

  const currentHeight = heightMap[size];

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 100 100"
          className={`${currentHeight} w-auto aspect-square`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logo-icon-peak" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="logo-icon-compass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
          </defs>

          {/* Mini Peak Contour */}
          <path
            d="M 15 55 L 35 28 L 50 44 L 70 12 L 92 52"
            stroke="url(#logo-icon-peak)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 70 14 L 78 36 L 87 43"
            stroke="url(#logo-icon-peak)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Compass Circle */}
          <g transform="translate(50, 72)">
            <circle cx="0" cy="0" r="24" fill="url(#logo-icon-compass)" />
            {/* 3D Directional Plane */}
            <path d="M 12 -12 L -11 -1 L -3 3 Z" fill="#ffffff" />
            <path d="M 12 -12 L -3 3 L 1 11 Z" fill="#e2e8f0" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <svg
        viewBox="0 0 310 115"
        className={`${currentHeight} w-auto`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Mountain Gradient: Cyan to Emerald Teal */}
          <linearGradient id="adaptgo-main-peak" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="45%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>

          {/* Compass Circle Gradient */}
          <linearGradient id="adaptgo-main-compass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="45%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>

        {/* Mountain Peaks Graphic */}
        {variant !== 'wordmark' && (
          <g id="mountain-peaks" strokeLinecap="round" strokeLinejoin="round">
            {/* Primary Twin Peaks */}
            <path
              d="M 90 60 L 122 30 L 142 48 L 172 10 L 210 58"
              stroke="url(#adaptgo-main-peak)"
              strokeWidth="7"
              strokeMiterlimit="4"
            />
            {/* Ridge & Facet Detail Lines */}
            <path
              d="M 172 12 L 183 38 L 197 48"
              stroke="url(#adaptgo-main-peak)"
              strokeWidth="4"
            />
            <path
              d="M 183 38 L 179 50"
              stroke="url(#adaptgo-main-peak)"
              strokeWidth="3"
            />
            <path
              d="M 122 30 L 129 44"
              stroke="url(#adaptgo-main-peak)"
              strokeWidth="3"
            />
          </g>
        )}

        {/* Typography: "ADAPT" in Ultra-Bold Midnight Navy */}
        <text
          x="6"
          y="104"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Montserrat', 'Inter', 'Segoe UI', sans-serif"
          fontWeight="900"
          fontSize="52"
          letterSpacing="-0.04em"
          fill="#0a192f"
        >
          ADAPT
        </text>

        {/* Letter: "G" */}
        <text
          x="176"
          y="104"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Montserrat', 'Inter', 'Segoe UI', sans-serif"
          fontWeight="900"
          fontSize="52"
          letterSpacing="-0.04em"
          fill="#0a192f"
        >
          G
        </text>

        {/* Letter: "O" as Navigation Compass Badge */}
        <g id="nav-compass-o" transform="translate(258, 86)">
          {/* Gradient Circle */}
          <circle cx="0" cy="0" r="22.5" fill="url(#adaptgo-main-compass)" />

          {/* 3D Stylized Navigation Arrow / Paper Plane */}
          <path
            d="M 11 -11 L -11 -1 L -3 3 Z"
            fill="#ffffff"
          />
          <path
            d="M 11 -11 L -3 3 L 1 11 Z"
            fill="#e2e8f0"
          />
        </g>
      </svg>

      {showTagline && (
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mt-1 pl-1">
          Adaptive Travel Planning
        </span>
      )}
    </div>
  );
};
