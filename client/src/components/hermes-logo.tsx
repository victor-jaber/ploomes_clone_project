interface HermesLogoProps {
  size?: number;
  className?: string;
}

export function HermesLogo({ size = 40, className = "" }: HermesLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      
      <g transform="translate(50, 50)">
        <path
          d="M-8 -8 L-25 -20 Q-30 -22 -28 -17 L-18 -5 Q-15 -2 -12 -4 Z"
          fill="url(#wingGradient)"
          opacity="0.9"
        />
        <path
          d="M-10 -3 L-32 -8 Q-38 -9 -35 -4 L-18 3 Q-14 5 -12 2 Z"
          fill="url(#wingGradient)"
          opacity="0.85"
        />
        <path
          d="M-10 5 L-30 8 Q-36 10 -32 14 L-15 10 Q-11 9 -10 5 Z"
          fill="url(#wingGradient)"
          opacity="0.75"
        />
        
        <path
          d="M8 -8 L25 -20 Q30 -22 28 -17 L18 -5 Q15 -2 12 -4 Z"
          fill="url(#wingGradient)"
          opacity="0.9"
        />
        <path
          d="M10 -3 L32 -8 Q38 -9 35 -4 L18 3 Q14 5 12 2 Z"
          fill="url(#wingGradient)"
          opacity="0.85"
        />
        <path
          d="M10 5 L30 8 Q36 10 32 14 L15 10 Q11 9 10 5 Z"
          fill="url(#wingGradient)"
          opacity="0.75"
        />
        
        <circle cx="0" cy="0" r="16" fill="currentColor" opacity="0.15" />
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          fill="currentColor"
        >
          H
        </text>
      </g>
    </svg>
  );
}

export function HermesLogoFull({ size = 40, className = "" }: HermesLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl" />
        <div className="relative flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg p-2">
          <HermesLogo size={size} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-xl tracking-tight">Hermes</span>
        <span className="text-xs text-muted-foreground">CRM</span>
      </div>
    </div>
  );
}
