// OCR via ocr.space API — funciona em Expo Go sem módulos nativos
// Chave gratuita: cadastra em https://ocr.space/ocrapi (25k req/mês grátis)
// A chave 'helloworld' é demo com limite de 25 req/20s — suficiente pra testar

export interface OcrWord {
  WordText: string;
  Left: number;
  Top: number;
  Height: number;
  Width: number;
}

export interface OcrLine {
  LineText: string;
  Words: OcrWord[];
}

export async function recognizeFromBase64(
  base64: string,
  apiKey = 'helloworld',
): Promise<OcrLine[]> {
  const body = new FormData();
  body.append('base64Image', `data:image/jpeg;base64,${base64}`);
  body.append('language', 'eng');
  body.append('OCREngine', '2');
  body.append('isOverlayRequired', 'true');
  body.append('scale', 'true');
  body.append('isTable', 'false');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: apiKey },
    body,
  });

  if (!res.ok) throw new Error(`OCR HTTP ${res.status}`);

  const data = await res.json();

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] || 'OCR error');
  }

  return data.ParsedResults?.[0]?.TextOverlay?.Lines ?? [];
}
