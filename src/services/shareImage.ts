import {ShareImagePayload} from '../types/quran';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${line} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

/**
 * Generates an indigo/violet glassmorphic PNG card for any Ayah + Translation.
 */
export async function renderAyahShareCard(payload: ShareImagePayload): Promise<{
  blob: Blob;
  dataUrl: string;
}> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with loaded fonts
    }
  }

  const width = 1080;
  const paddingX = 88;
  const cardMargin = 48;
  const innerWidth = width - paddingX * 2;

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;

  mctx.font = '600 46px "Amiri Quran", "Amiri", serif';
  const arabicLines = wrapLines(mctx, payload.arabicText, innerWidth);

  mctx.font = '400 28px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif';
  const translationLines = payload.translationText
    ? wrapLines(mctx, payload.translationText, innerWidth)
    : [];

  const arabicBlockHeight = arabicLines.length * 80;
  const translationBlockHeight = translationLines.length > 0 ? translationLines.length * 42 + 32 : 0;
  const height = Math.max(780, 320 + arabicBlockHeight + translationBlockHeight + 160);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Deep indigo/violet cosmic backdrop
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0E0B1F');
  bg.addColorStop(0.5, '#1D1848');
  bg.addColorStop(1, '#2D266F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Blurred ambient accent orbs
  const orb1 = ctx.createRadialGradient(width * 0.2, height * 0.18, 20, width * 0.2, height * 0.18, 340);
  orb1.addColorStop(0, 'rgba(91, 91, 214, 0.45)');
  orb1.addColorStop(1, 'rgba(91, 91, 214, 0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, width, height);

  const orb2 = ctx.createRadialGradient(width * 0.85, height * 0.82, 20, width * 0.85, height * 0.82, 320);
  orb2.addColorStop(0, 'rgba(242, 182, 109, 0.26)');
  orb2.addColorStop(1, 'rgba(242, 182, 109, 0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, width, height);

  // Inner glass card
  const cx = cardMargin;
  const cy = cardMargin;
  const cw = width - cardMargin * 2;
  const ch = height - cardMargin * 2;
  const radius = 40;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, radius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.stroke();
  ctx.restore();

  // Top Header Citation
  ctx.fillStyle = '#F2B66D';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${payload.surahNameEn} · ${payload.surahNumber}:${payload.ayahNumber}`,
    paddingX,
    126
  );

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 30px "Amiri Quran", "Amiri", serif';
  ctx.textAlign = 'right';
  ctx.fillText(payload.surahNameAr, width - paddingX, 126);

  // Subtle gold divider
  ctx.strokeStyle = 'rgba(242, 182, 109, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(paddingX, 158);
  ctx.lineTo(width - paddingX, 158);
  ctx.stroke();

  // Arabic Ayah Text (RTL)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 46px "Amiri Quran", "Amiri", serif';
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  let y = 236;
  for (const line of arabicLines) {
    ctx.fillText(line, width - paddingX, y);
    y += 80;
  }

  // Translation Text
  if (translationLines.length > 0) {
    y += 28;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(245, 244, 255, 0.86)';
    ctx.font = '400 28px "Plus Jakarta Sans", "Noto Sans Bengali", sans-serif';
    for (const line of translationLines) {
      ctx.fillText(line, paddingX, y);
      y += 42;
    }
  }

  // Bottom Brand Watermark
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(242, 182, 109, 0.9)';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Quranfy', paddingX, height - 92);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('100% Free · Offline Ready', width - paddingX, height - 92);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png');
  });

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
  };
}
