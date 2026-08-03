import { BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

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
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

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

      {/* Botão de Excluir */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={onEdgeClick}
            className="w-5 h-5 bg-white hover:bg-red-500 hover:text-white text-gray-400 hover:border-red-500 rounded-full flex items-center justify-center border border-gray-200 transition-colors cursor-pointer shadow-sm"
            title="Remover conexão"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
