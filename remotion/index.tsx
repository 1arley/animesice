import { Composition, registerRoot } from "remotion";
import { useCurrentFrame, interpolate } from "remotion";

function CrystalInvocation() {
  const frame = useCurrentFrame();
  const progress = frame / 120;
  const pulse = 0.65 + Math.sin(progress * Math.PI * 6) * 0.12;
  const sweep = interpolate(frame, [28, 78], [-900, 900], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ position: "relative", width: 720, height: 720, overflow: "hidden", backgroundColor: "#000000" }}>
    <svg width="720" height="720" viewBox="0 0 720 720" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="#57c8ff" stopOpacity="0.38" />
          <stop offset="72%" stopColor="#2386ff" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8f8ff" stopOpacity="0.85" />
          <stop offset="52%" stopColor="#54b9ef" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#2355a2" stopOpacity="0.68" />
        </linearGradient>
        <linearGradient id="foil">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="48%" stopColor="#b9f4ff" stopOpacity="0.55" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="360" cy="360" r="280" fill="url(#halo)" opacity={pulse} />
      <path d="M360 207 442 309 420 412 360 513 300 412 278 309Z" fill="url(#crystal)" stroke="#c6f4ff" strokeOpacity="0.85" strokeWidth="2" />
      <path d="m360 207 82 102-82 51-82-51Z" fill="#c4f4ff" fillOpacity="0.27" stroke="#d8f8ff" strokeOpacity="0.5" />
      <path d="m278 309 82 51-60 52Z" fill="#4aa4e8" fillOpacity="0.46" />
      <path d="m442 309-82 51 60 52Z" fill="#98ecff" fillOpacity="0.3" />
      <path d="m300 412 60-52v153Z" fill="#2465b7" fillOpacity="0.45" />
      <path d="m420 412-60-52v153Z" fill="#63b8ed" fillOpacity="0.42" />
      {[0, 1, 2].map((ring) => <ellipse
        key={ring}
        cx="360"
        cy="360"
        rx={125 + ring * 43}
        ry={56 + ring * 21}
        fill="none"
        stroke={ring === 1 ? "#a9eaff" : "#5ebcff"}
        strokeWidth={ring === 1 ? 2 : 1.5}
        strokeOpacity={0.35 + pulse * 0.3}
        transform={`rotate(${frame * (ring % 2 ? -2 : 1.2) + ring * 42} 360 360)`}
      />)}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = i * Math.PI / 12 + progress * Math.PI * 2;
        const radius = 194 + i % 4 * 12;
        return <circle key={i} cx={360 + Math.cos(angle) * radius} cy={360 + Math.sin(angle) * radius * 0.65}
          r={i % 5 === 0 ? 3 : 1.7} fill="#bbf3ff" opacity={0.35 + (Math.sin(frame / 8 + i) + 1) * 0.3} />;
      })}
      <rect x={sweep - 90} y="0" width="180" height="720" fill="url(#foil)" transform={`rotate(20 360 360)`} opacity={frame < 28 || frame > 78 ? 0 : 1} />
    </svg>
  </div>;
}

function RemotionRoot() {
  return <Composition id="GachaCrystal" component={CrystalInvocation} durationInFrames={120} fps={30} width={720} height={720} />;
}

registerRoot(RemotionRoot);
