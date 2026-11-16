import type { MotifKind } from "@/config/site";

/**
 * Seis motivos gráficos, um por área de atuação. Desenho técnico em traço
 * fino, animado em CSS. `live` mantém a animação rodando; sem ele, anima
 * somente quando o cartão recebe o mouse ou o foco.
 */
export function Motif({ kind, live = false, className = "" }: { kind: MotifKind; live?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
      className={`motif ${live ? "motif-live" : "motif-idle"} ${className}`}
    >
      {MOTIFS[kind]}
    </svg>
  );
}

const A = "var(--color-accent)";

const MOTIFS: Record<MotifKind, React.ReactNode> = {
  // Excelência: anéis de tolerância convergindo para o alvo.
  rings: (
    <>
      <g className="spin">
        <circle cx="100" cy="100" r="84" strokeDasharray="2 10" />
        <circle cx="100" cy="100" r="62" strokeDasharray="40 14" />
      </g>
      <g className="spin-r">
        <circle cx="100" cy="100" r="40" strokeDasharray="18 8" />
      </g>
      <path d="M100 6v38M100 156v38M6 100h38M156 100h38" opacity=".5" />
      <circle cx="100" cy="100" r="15" stroke={A} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="3.5" fill={A} stroke="none" className="pulse" />
    </>
  ),
  // Produtividade: ritmo de produção, barras subindo no compasso do takt.
  takt: (
    <>
      <path d="M14 178h172" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect
          key={i}
          x={20 + i * 21}
          y={150 - i * 15}
          width="12"
          height={28 + i * 15}
          className="rise"
          style={{ animationDelay: `${i * 0.14}s` }}
          {...(i === 7 ? { fill: A, stroke: "none" } : {})}
        />
      ))}
      <path d="M14 152 L186 34" strokeDasharray="3 6" opacity=".6" />
    </>
  ),
  // Custos: curva em degraus descendo até a nova base.
  steps: (
    <>
      <path d="M20 20v160h164" opacity=".5" />
      <path d="M20 44h36v30h34v30h34v30h34v24h26" className="draw" stroke={A} strokeWidth="1.5" />
      {[44, 74, 104, 134].map((y, i) => (
        <path key={y} d={`M20 ${y}h${36 + i * 34}`} strokeDasharray="2 6" opacity=".35" />
      ))}
      <circle cx="184" cy="158" r="4" fill={A} stroke="none" className="pulse" />
    </>
  ),
  // Estoques: endereços de armazém, posições ocupadas e fluxo de reposição.
  grid: (
    <>
      {Array.from({ length: 25 }, (_, i) => {
        const x = 24 + (i % 5) * 32;
        const y = 24 + Math.floor(i / 5) * 32;
        const on = [1, 3, 7, 8, 12, 16, 18, 22].includes(i);
        const hot = i === 13;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="24"
            height="24"
            {...(hot ? { fill: A, stroke: "none" } : on ? { fill: "currentColor", fillOpacity: 0.16 } : {})}
            className={hot || on ? "pulse" : undefined}
            style={{ animationDelay: `${(i % 7) * 0.3}s` }}
          />
        );
      })}
      <path d="M12 196h176" className="dash" />
    </>
  ),
  // Processos: o caminho emaranhado ao lado do caminho direto.
  untangle: (
    <>
      <path
        d="M16 60c30-50 50 60 20 50s20-80 44-30-30 60 0 62 40-90 60-40-20 50 44 20"
        className="draw"
        opacity=".7"
      />
      <path d="M16 162h168" stroke={A} strokeWidth="1.5" />
      <path d="M172 152l12 10-12 10" stroke={A} strokeWidth="1.5" />
      <circle cx="16" cy="60" r="3" fill="currentColor" stroke="none" />
      <circle cx="16" cy="162" r="3" fill={A} stroke="none" />
    </>
  ),
  // IA e BI: rede de dados convergindo para uma decisão.
  network: (
    <>
      {[30, 65, 100, 135, 170].map((y, i) => (
        <g key={y}>
          <path d={`M30 ${y}L100 ${i % 2 ? 70 : 130}`} opacity=".45" className="dash" />
          <circle cx="30" cy={y} r="3" fill="currentColor" stroke="none" className="pulse" style={{ animationDelay: `${i * 0.25}s` }} />
        </g>
      ))}
      <path d="M100 70L170 100M100 130L170 100M100 70v60" opacity=".7" />
      <circle cx="100" cy="70" r="5" />
      <circle cx="100" cy="130" r="5" />
      <circle cx="170" cy="100" r="9" stroke={A} strokeWidth="1.5" />
      <circle cx="170" cy="100" r="3.5" fill={A} stroke="none" className="pulse" />
    </>
  ),
};
