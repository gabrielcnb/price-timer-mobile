import type { OcrLine, OcrWord } from './ocrService';

export interface PriceDetection {
  value: number;
  currency: string;
  minutes: number;
  frame: { x: number; y: number; width: number; height: number };
  originalText: string;
  id: string;
}

// Símbolos suportados: € $ £ R$ ¥ ₹ ₩ CHF
const CURRENCY_PREFIX = /([€$£¥₹₩]|R\$|CHF)\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g;
const CURRENCY_SUFFIX = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*([€$£¥₹₩]|R\$|CHF)/g;

function parseAmount(raw: string): number {
  let s = raw.trim();
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    s = parts.length === 2 && parts[1].length <= 2
      ? s.replace(',', '.')
      : s.replace(/,/g, '');
  }
  return parseFloat(s);
}

// Combina bounding boxes de várias palavras num único rect
function mergeBounds(words: OcrWord[]): { Left: number; Top: number; Width: number; Height: number } {
  const minX = Math.min(...words.map(w => w.Left));
  const minY = Math.min(...words.map(w => w.Top));
  const maxX = Math.max(...words.map(w => w.Left + w.Width));
  const maxY = Math.max(...words.map(w => w.Top + w.Height));
  return { Left: minX, Top: minY, Width: maxX - minX, Height: maxY - minY };
}

// Encontra as palavras que pertencem ao match do preço
function getPriceWords(words: OcrWord[], matchText: string, currencyChar: string): OcrWord[] {
  if (!words.length) return [];

  // Encontra palavra com o símbolo de moeda
  const currIdx = words.findIndex(w =>
    w.WordText.includes(currencyChar) || w.WordText.startsWith(currencyChar)
  );

  if (currIdx !== -1) {
    // Expande para palavras adjacentes com dígitos (preço pode estar fragmentado)
    const result: OcrWord[] = [words[currIdx]];
    for (let i = currIdx + 1; i < words.length && i <= currIdx + 3; i++) {
      if (/[\d.,]/.test(words[i].WordText)) result.push(words[i]);
      else break;
    }
    for (let i = currIdx - 1; i >= 0 && i >= currIdx - 2; i--) {
      if (/[\d.,]/.test(words[i].WordText)) result.unshift(words[i]);
      else break;
    }
    return result;
  }

  // Fallback: primeira palavra com dígito
  const numWord = words.find(w => /\d/.test(w.WordText));
  return numWord ? [numWord] : [words[0]];
}

function mapToScreen(
  left: number, top: number, width: number, height: number,
  imgW: number, imgH: number,
  screenW: number, screenH: number,
) {
  const scale = Math.max(screenW / imgW, screenH / imgH);
  const offsetX = (screenW - imgW * scale) / 2;
  const offsetY = (screenH - imgH * scale) / 2;
  return {
    x: left * scale + offsetX,
    y: top * scale + offsetY,
    width: width * scale,
    height: height * scale,
  };
}

export function extractPrices(
  lines: OcrLine[],
  imgW: number,
  imgH: number,
  screenW: number,
  screenH: number,
  hourlyWage: number,
): PriceDetection[] {
  const detections: PriceDetection[] = [];
  const seen = new Set<string>();

  const tryMatch = (
    line: OcrLine,
    regex: RegExp,
    getCurrency: (m: RegExpExecArray) => string,
    getAmount: (m: RegExpExecArray) => string,
  ) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line.LineText)) !== null) {
      const currencyChar = getCurrency(match);
      const rawAmount = getAmount(match);
      const value = parseAmount(rawAmount);

      if (isNaN(value) || value <= 0 || value > 100_000) continue;

      const key = `${currencyChar}${value.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const minutes = Math.round((value / hourlyWage) * 60);
      const priceWords = getPriceWords(line.Words ?? [], match[0], currencyChar);
      const bounds = priceWords.length ? mergeBounds(priceWords) : { Left: 0, Top: 0, Width: 80, Height: 24 };

      detections.push({
        value,
        currency: currencyChar,
        minutes,
        frame: mapToScreen(bounds.Left, bounds.Top, bounds.Width, bounds.Height, imgW, imgH, screenW, screenH),
        originalText: match[0].trim(),
        id: key,
      });
    }
  };

  for (const line of lines) {
    tryMatch(line, CURRENCY_PREFIX, m => m[1], m => m[2]);
    tryMatch(line, CURRENCY_SUFFIX, m => m[2], m => m[1]);
  }

  return detections;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
