import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workflow Builder',
};

export default function WorkflowBuilderPage() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Workflow diagram centered around Coming Soon badge */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Blurred workflow background */}
          <svg
            viewBox="0 0 400 320"
            className="w-[500px] h-auto blur-[2px] opacity-70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Connection lines */}
            {/* Trigger to Decision */}
            <path d="M 200 65 L 200 110" stroke="hsl(var(--border))" strokeWidth="2" />
            {/* Decision to Left Node */}
            <path d="M 160 160 L 100 200 L 100 230" stroke="hsl(var(--border))" strokeWidth="2" />
            {/* Decision to Right Node */}
            <path d="M 240 160 L 300 200 L 300 230" stroke="hsl(var(--border))" strokeWidth="2" />

            {/* Trigger Node - top */}
            <rect
              x="120"
              y="15"
              width="160"
              height="50"
              rx="8"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
            />
            <circle cx="145" cy="40" r="10" fill="hsl(var(--muted))" />
            <rect x="162" y="32" width="70" height="8" rx="2" fill="hsl(var(--muted))" />
            <rect x="162" y="44" width="50" height="6" rx="2" fill="hsl(var(--muted))" />

            {/* Decision Node - diamond in center */}
            <g transform="translate(140, 110)">
              <polygon
                points="60,0 120,50 60,100 0,50"
                fill="hsl(var(--background))"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
              />
              <rect x="35" y="42" width="50" height="8" rx="2" fill="hsl(var(--muted))" />
              <rect x="42" y="54" width="36" height="6" rx="2" fill="hsl(var(--muted))" />
            </g>

            {/* Left Action Node */}
            <rect
              x="20"
              y="230"
              width="160"
              height="50"
              rx="8"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
            />
            <rect x="35" y="245" width="20" height="20" rx="4" fill="hsl(var(--muted))" />
            <rect x="62" y="247" width="70" height="8" rx="2" fill="hsl(var(--muted))" />
            <rect x="62" y="259" width="50" height="6" rx="2" fill="hsl(var(--muted))" />

            {/* Right Action Node */}
            <rect
              x="220"
              y="230"
              width="160"
              height="50"
              rx="8"
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
            />
            <rect x="235" y="245" width="20" height="20" rx="4" fill="hsl(var(--muted))" />
            <rect x="262" y="247" width="70" height="8" rx="2" fill="hsl(var(--muted))" />
            <rect x="262" y="259" width="50" height="6" rx="2" fill="hsl(var(--muted))" />
          </svg>

          {/* Coming Soon Label - centered on top */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-background border border-border px-6 py-4 shadow-lg">
              <p className="text-lg font-semibold text-foreground">Coming Soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
