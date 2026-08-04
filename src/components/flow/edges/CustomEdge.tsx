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

  const gradientId = `ig-gradient-${id}`;

  return (
    <>
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor="#f9ce34" />
          <stop offset="50%" stopColor="#ee2a7b" />
          <stop offset="100%" stopColor="#6228d7" />
        </linearGradient>
      </defs>

      <path
        d={edgePath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={8}
        strokeOpacity={0.22}
        style={{ filter: 'blur(3px)' }}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          strokeWidth: 3,
          stroke: `url(#${gradientId})`,
          strokeLinecap: 'round',
          ...style
        }}
      />

      <path
        d={edgePath}
        fill="none"
        stroke="#ee2a7b"
        strokeWidth={3}
        strokeDasharray="7 7"
        className="animate-dash-flow-neon"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 4px rgba(238, 42, 123, 0.55))' }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all'
          }}
          className="nodrag nopan"
        >
          <button
            onClick={onEdgeClick}
            className="w-5 h-5 bg-white hover:bg-gradient-to-r hover:from-[#ee2a7b] hover:to-[#6228d7] hover:text-white text-gray-400 hover:border-transparent rounded-full flex items-center justify-center border border-gray-200 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-110"
            title="Remover conexão"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
