import { useMemo } from 'react';
import type { SagaStage } from '../types/api';

interface GrandLineMapProps {
  width: number;
  height: number;
  stages: SagaStage[];
  activeIndex: number;
}

// Mapa del Grand Line dibujado con SVG a partir de las coordenadas de /sagas/{id}/story.
// El barco se ubica en la isla de la etapa activa y la ruta recorrida se dibuja hasta ella.
export function GrandLineMap({ width, height, stages, activeIndex }: GrandLineMapProps) {
  // Ruta completa (une las islas en orden) y qué fracción de su largo se recorrió al llegar a cada etapa
  const { routePath, traveledAt } = useMemo(() => {
    const points = stages.map((stage) => stage.island);
    const routePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      cumulative.push(cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    const total = cumulative[cumulative.length - 1];
    return { routePath, traveledAt: cumulative.map((length) => (total > 0 ? length / total : 1)) };
  }, [stages]);

  const active = stages[activeIndex];
  const traveled = traveledAt[activeIndex] ?? 0;
  const fontSize = Math.max(14, Math.round(width / 38));
  // Abajo en las etapas pares y arriba en las impares (salvo que no haya espacio en el borde)
  const labelBelow = (index: number, y: number) => (index % 2 === 0 ? y < height - 60 : y < 70);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Mapa del Grand Line: el barco está en ${active.island.name}, etapa ${activeIndex + 1} de ${stages.length}.`}
      className="h-auto max-h-[22vh] w-full lg:max-h-none"
    >
      <rect width={width} height={height} rx={16} fill="var(--saga-surface)" />
      {/* Corrientes del mar (decorativas) */}
      {[0.25, 0.5, 0.75].map((f) => (
        <path
          key={f}
          d={`M0 ${height * f} Q ${width * 0.25} ${height * f - 18} ${width * 0.5} ${height * f} T ${width} ${height * f}`}
          fill="none"
          stroke="var(--saga-text)"
          strokeOpacity={0.07}
          strokeWidth={3}
        />
      ))}

      {/* Ruta completa (punteada) y ruta recorrida (se dibuja hasta la etapa activa) */}
      <path d={routePath} fill="none" stroke="var(--saga-text)" strokeOpacity={0.3} strokeWidth={4} strokeDasharray="10 12" />
      <path
        d={routePath}
        pathLength={1}
        fill="none"
        stroke="var(--saga-primary)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 1"
        strokeDashoffset={1 - traveled}
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />

      {stages.map((stage, index) => {
        const visited = index <= activeIndex;
        const isActive = index === activeIndex;
        return (
          <g key={stage.id}>
            <circle
              cx={stage.island.x}
              cy={stage.island.y}
              r={isActive ? 16 : 11}
              fill={visited ? 'var(--saga-primary)' : 'var(--saga-background)'}
              stroke={isActive ? 'var(--saga-accent)' : 'var(--saga-text)'}
              strokeOpacity={isActive ? 1 : 0.5}
              strokeWidth={4}
            />
            <text
              x={stage.island.x}
              // Etiquetas alternadas arriba/abajo para que nombres de islas vecinas no se pisen
              y={labelBelow(index, stage.island.y) ? stage.island.y + 44 : stage.island.y - 52}
              textAnchor={stage.island.x < 120 ? 'start' : stage.island.x > width - 120 ? 'end' : 'middle'}
              fontSize={fontSize}
              fontWeight={isActive ? 700 : 400}
              fill="var(--saga-text)"
              fillOpacity={isActive ? 1 : 0.65}
              stroke="var(--saga-surface)"
              strokeWidth={6}
              paintOrder="stroke"
            >
              {stage.island.name}
            </text>
          </g>
        );
      })}

      {/* Barco (dibujo propio): se desplaza a la isla activa */}
      <g
        style={{ transform: `translate(${active.island.x}px, ${active.island.y}px)` }}
        className="transition-transform duration-700 ease-out motion-reduce:transition-none"
        aria-hidden="true"
      >
        <g transform="translate(-22 -40)">
          <path d="M22 4 L22 34" stroke="var(--saga-text)" strokeWidth={3} />
          <path d="M24 6 L42 30 L24 30 Z" fill="var(--saga-accent)" />
          <path d="M0 34 L44 34 L36 46 L8 46 Z" fill="var(--saga-text)" />
        </g>
      </g>
    </svg>
  );
}
