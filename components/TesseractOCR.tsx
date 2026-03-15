/**
 * OCR 100% local no dispositivo via Tesseract.js rodando numa WebView oculta.
 * Primeira carga: baixa ~8MB de Tesseract do CDN (uma só vez, fica cacheado).
 * OCR em si: roda no motor WebAssembly do iPhone, sem enviar nada pra fora.
 */
import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { OcrLine } from '../utils/ocrService';

export interface OcrRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TesseractOCRRef {
  recognize: (base64: string, rect?: OcrRect) => Promise<OcrLine[]>;
  ready: boolean;
}

const HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<script>
let worker = null;

Tesseract.createWorker('eng').then(w => {
  worker = w;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
}).catch(err => {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
});

window.addEventListener('message', async function(e) {
  try {
    const msg = JSON.parse(e.data);
    if (msg.type !== 'recognize') return;
    const opts = msg.rect ? { rectangle: msg.rect } : {};
    const result = await worker.recognize('data:image/jpeg;base64,' + msg.base64, opts);
    const lines = result.data.lines.map(function(l) {
      return {
        LineText: l.text.trim(),
        Words: l.words.map(function(w) {
          return {
            WordText: w.text,
            Left: w.bbox.x0,
            Top: w.bbox.y0,
            Width: w.bbox.x1 - w.bbox.x0,
            Height: w.bbox.y1 - w.bbox.y0,
          };
        })
      };
    });
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'result', id: msg.id, lines: lines }));
  } catch(err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
  }
});
</script>
</body></html>`;

const TesseractOCR = forwardRef<TesseractOCRRef>((_, ref) => {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const pendingRef = useRef<Map<string, { resolve: (v: OcrLine[]) => void; reject: (e: any) => void }>>(new Map());

  useImperativeHandle(ref, () => ({
    ready,
    recognize(base64: string, rect?: OcrRect): Promise<OcrLine[]> {
      return new Promise((resolve, reject) => {
        if (!webviewRef.current || !ready) {
          reject(new Error('OCR ainda carregando...'));
          return;
        }
        const id = Math.random().toString(36).slice(2);
        pendingRef.current.set(id, { resolve, reject });
        webviewRef.current.postMessage(JSON.stringify({ type: 'recognize', id, base64, rect }));
        setTimeout(() => {
          if (pendingRef.current.has(id)) {
            pendingRef.current.delete(id);
            reject(new Error('Timeout OCR'));
          }
        }, 15000);
      });
    },
  }), [ready]);

  const onMessage = (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready') {
        setReady(true);
      } else if (msg.type === 'result') {
        const pending = pendingRef.current.get(msg.id);
        if (pending) {
          pendingRef.current.delete(msg.id);
          pending.resolve(msg.lines);
        }
      } else if (msg.type === 'error') {
        pendingRef.current.forEach(p => p.reject(new Error(msg.message)));
        pendingRef.current.clear();
      }
    } catch {}
  };

  return (
    <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <WebView
        ref={webviewRef}
        style={{ width: 1, height: 1 }}
        source={{ html: HTML }}
        onMessage={onMessage}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
});

export default TesseractOCR;
