/**
 * Moldura com recorte: contorno fino com uma aba chanfrada no canto inferior
 * direito, onde fica a legenda. É a assinatura visual do site.
 */
export function Frame({
  children,
  tab,
  className = "",
  fill,
  style,
}: {
  children: React.ReactNode;
  tab?: React.ReactNode;
  className?: string;
  /** Cor de fundo interna (deve acompanhar a seção). */
  fill?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`frame group ${className}`} style={{ ...(fill ? ({ "--fill": fill } as React.CSSProperties) : {}), ...style }}>
      <div className="frame-shape" aria-hidden />
      <div className="frame-body">{children}</div>
      {tab ? <div className="frame-tab t-eyebrow">{tab}</div> : null}
    </div>
  );
}
