import { useEffect, useRef } from "react";

export interface BarDatum {
  label: string;
  value: number;
}

interface MinimalBarChartProps {
  data: BarDatum[];
  title: string;
  yLabel?: string;
  className?: string;
  "data-testid"?: string;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, monospace";

function draw(canvas: HTMLCanvasElement, data: BarDatum[], title: string, yLabel?: string) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  /* ── blank white canvas ── */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  if (!data.length) {
    ctx.fillStyle = "#000";
    ctx.font = `italic 15px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("No data yet", W / 2, H / 2);
    return;
  }

  /* ── margins ── */
  const ml = 52;   // left  — Y axis labels
  const mr = 18;
  const mt = 44;   // top   — title
  const mb = 38;   // bottom — X labels

  const cW = W - ml - mr;
  const cH = H - mt - mb;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  /* round max up to a clean tick */
  const rawStep = maxVal / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / mag) * mag || 1;
  const tickCount = Math.ceil(maxVal / step);
  const axisMax = step * tickCount;

  /* ── Y grid lines + labels ── */
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  ctx.textAlign = "right";
  ctx.font = `400 11px ${MONO}`;

  for (let i = 0; i <= tickCount; i++) {
    const v = i * step;
    const y = mt + cH - (v / axisMax) * cH;

    /* grid line */
    ctx.beginPath();
    ctx.moveTo(ml, y);
    ctx.lineTo(ml + cW, y);
    ctx.globalAlpha = i === 0 ? 1 : 0.12;
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* label */
    ctx.fillText(String(v), ml - 6, y + 4);
  }

  /* ── Y axis label ── */
  if (yLabel) {
    ctx.save();
    ctx.translate(12, mt + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.font = `italic 11px ${FONT}`;
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  /* ── Bars ── */
  const n = data.length;
  const groupW = cW / n;
  const barW = Math.max(4, Math.min(groupW * 0.52, 48));

  data.forEach((d, i) => {
    const barH = (d.value / axisMax) * cH;
    const x = ml + i * groupW + (groupW - barW) / 2;
    const y = mt + cH - barH;

    /* bar */
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, barW, barH);

    /* value above bar — only if there's room */
    if (barH > 18) {
      ctx.fillStyle = "#FFF";
      ctx.textAlign = "center";
      ctx.font = `500 10px ${MONO}`;
      ctx.fillText(String(d.value), x + barW / 2, y + 13);
    }

    /* X axis label */
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.font = `400 11px ${FONT}`;
    const labelX = ml + i * groupW + groupW / 2;
    ctx.fillText(d.label, labelX, mt + cH + 20);
  });

  /* ── Axis border (bottom + left) ── */
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(ml, mt);
  ctx.lineTo(ml, mt + cH);
  ctx.lineTo(ml + cW, mt + cH);
  ctx.stroke();

  /* ── Title ── */
  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.font = `600 14px ${FONT}`;
  ctx.fillText(title, ml, 26);
}

export default function MinimalBarChart({
  data,
  title,
  yLabel,
  className = "",
  "data-testid": testId,
}: MinimalBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const roRef     = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const redraw = () => draw(canvas, data, title, yLabel);
    redraw();

    roRef.current = new ResizeObserver(redraw);
    roRef.current.observe(canvas);

    return () => roRef.current?.disconnect();
  }, [data, title, yLabel]);

  return (
    <div
      className={className}
      data-testid={testId}
      style={{
        background: "#FFFFFF",
        border: "1px solid #000",
        padding: "0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
