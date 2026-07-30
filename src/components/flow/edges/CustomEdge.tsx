import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  return (
    <>
      {/* Camada 1: Halo / Brilho Neon Azul de Fundo */}
      <path
        d={edgePath}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={8}
        strokeOpacity={0.25}
        style={{ filter: 'blur(3px)' }}
      />

      {/* Camada 2: Linha Base Neon Cyan */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 3,
          stroke: '#00c3ff',
          strokeLinecap: 'round',
          ...style
        }}
      />

      {/* Camada 3: Pontilhado Neon Azul se movendo continuamente */}
      <path
        d={edgePath}
        fill="none"
        stroke="#00ffff"
        strokeWidth={3}
        strokeDasharray="6 6"
        className="animate-dash-flow-neon"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 5px #00ffff)' }}
      />
    </>
  );
}
