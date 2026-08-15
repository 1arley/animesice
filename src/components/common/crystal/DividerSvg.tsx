// Auto-generated from divider-ice-beam.svg via /tmp/opencode/gen-tsx.mjs.
// Hand-editable: keep ids so scroll animations can target them.
"use client";

export function DividerSvg() {
  return (
<svg viewBox="0 0 2560 120" fill="none" className="h-full w-full">
  <defs>
    
    <linearGradient id="beam-core" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stopColor="#38E8DA" stopOpacity="0"/>
      <stop offset="10%"  stopColor="#38E8DA" stopOpacity="0.5"/>
      <stop offset="35%"  stopColor="#38E8DA" stopOpacity="0.9"/>
      <stop offset="50%"  stopColor="#00E5FF" stopOpacity="1"/>
      <stop offset="65%"  stopColor="#38E8DA" stopOpacity="0.9"/>
      <stop offset="90%"  stopColor="#38E8DA" stopOpacity="0.5"/>
      <stop offset="100%" stopColor="#38E8DA" stopOpacity="0"/>
    </linearGradient>

    
    <linearGradient id="beam-bloom" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stopColor="#38E8DA" stopOpacity="0"/>
      <stop offset="18%"  stopColor="#38E8DA" stopOpacity="0.08"/>
      <stop offset="50%"  stopColor="#00E5FF" stopOpacity="0.22"/>
      <stop offset="82%"  stopColor="#38E8DA" stopOpacity="0.08"/>
      <stop offset="100%" stopColor="#38E8DA" stopOpacity="0"/>
    </linearGradient>

    
    <linearGradient id="shard-fill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.06"/>
      <stop offset="100%" stopColor="#38E8DA" stopOpacity="0.02"/>
    </linearGradient>

    
    <filter id="glow" x="-2%" y="-100%" width="104%" height="300%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    
    <filter id="shard-glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  
  <g id="beam">
    
    <polygon
      points="0,68 2560,36 2560,54 0,86"
      fill="url(#beam-bloom)"/>

    
    <polygon
      points="0,73 2560,41 2560,49 0,81"
      fill="url(#beam-core)"
      opacity="0.35"
      filter="url(#glow)"/>

    
    <polygon
      points="0,76 2560,44 2560,46 0,78"
      fill="url(#beam-core)"
      filter="url(#glow)"/>

    
    <polygon
      points="0,76.6 2560,44.6 2560,45.4 0,77.4"
      fill="url(#beam-core)"
      opacity="0.6"/>
  </g>

  
  <g id="shard-left" filter="url(#shard-glow)">
    
    <polygon
      points="1148,68 1164,59 1178,62 1174,72 1156,74"
      fill="url(#shard-fill)"
      stroke="#60F6E9"
      strokeWidth="0.8"
      strokeLinejoin="miter"
      opacity="0.8"/>
    
    <polyline
      points="1156,73 1166,63 1174,66"
      fill="none"
      stroke="#60F6E9"
      strokeWidth="0.4"
      opacity="0.35"/>
  </g>

  
  <g id="shard-right" filter="url(#shard-glow)">
    
    <polygon
      points="1388,56 1406,49 1418,54 1404,63"
      fill="url(#shard-fill)"
      stroke="#60F6E9"
      strokeWidth="0.8"
      strokeLinejoin="miter"
      opacity="0.8"/>
    
    <polyline
      points="1394,58 1406,52 1414,56"
      fill="none"
      stroke="#60F6E9"
      strokeWidth="0.4"
      opacity="0.35"/>
  </g>
</svg>

  );
}
