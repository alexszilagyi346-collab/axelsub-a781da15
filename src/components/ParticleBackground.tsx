import { useMemo } from "react";

const ParticleBackground = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 15,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, []);

  return (
    <>
      {/* Mesh gradient background */}
      <div className="mesh-gradient-bg" />
      
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle rounded-full"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `hsl(271 91% 65% / ${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px hsl(271 91% 65% / ${p.opacity * 0.5})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  );
};

export default ParticleBackground;
