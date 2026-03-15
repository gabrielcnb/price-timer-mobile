import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useWage } from '../hooks/useWage';
import { PriceOverlay } from '../components/PriceOverlay';
import { extractPrices, type PriceDetection, formatMinutes } from '../utils/priceParser';
import TesseractOCR, { type TesseractOCRRef } from '../components/TesseractOCR';

const SCAN_INTERVAL_MS = 3500;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const ocrRef = useRef<TesseractOCRRef>(null);
  const { wage, netWage, currency, taxRate, loaded } = useWage();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [detections, setDetections] = useState<PriceDetection[]>([]);
  const [scanning, setScanning] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'replace' | 'tap'>('replace');
  const isProcessingRef = useRef(false);

  // Tap mode
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tapResults, setTapResults] = useState<PriceDetection[] | null>(null);

  // Zoom via shared values (sem race condition)
  const zoomShared = useSharedValue(0);
  const savedZoom = useSharedValue(0);
  const [zoom, setZoom] = useState(0);

  useAnimatedReaction(
    () => zoomShared.value,
    (val) => runOnJS(setZoom)(val),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (ocrRef.current?.ready) { setOcrReady(true); clearInterval(interval); }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // --- Auto scan (replace mode) ---
  const runOCR = useCallback(async () => {
    if (isProcessingRef.current || !cameraRef.current || !wage || !ocrRef.current?.ready) return;
    isProcessingRef.current = true;
    setScanning(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (!photo?.base64) return;
      const lines = await ocrRef.current.recognize(photo.base64);
      const found = extractPrices(lines, photo.width ?? screenW, photo.height ?? screenH, screenW, screenH, wage);
      setDetections(found);
    } catch (e: any) {
      setError(e?.message ?? 'Erro no OCR');
    } finally {
      isProcessingRef.current = false;
      setScanning(false);
    }
  }, [wage, screenW, screenH]);

  useEffect(() => {
    if (!permission?.granted || !loaded || !wage || !ocrReady || mode !== 'replace') return;
    runOCR();
    const interval = setInterval(runOCR, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [permission?.granted, loaded, wage, ocrReady, runOCR, mode]);

  // --- Scan de região (tap mode) ---
  const runRegionOCR = useCallback(async (sx: number, sy: number, sw: number, sh: number) => {
    if (!cameraRef.current || !wage || !ocrRef.current?.ready) return;
    setScanning(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (!photo?.base64) return;
      const pW = photo.width ?? screenW;
      const pH = photo.height ?? screenH;
      const scale = Math.max(screenW / pW, screenH / pH);
      const offsetX = (pW - screenW / scale) / 2;
      const offsetY = (pH - screenH / scale) / 2;
      const rect = {
        left:   Math.max(0, Math.round(offsetX + sx / scale)),
        top:    Math.max(0, Math.round(offsetY + sy / scale)),
        width:  Math.min(pW, Math.round(sw / scale)),
        height: Math.min(pH, Math.round(sh / scale)),
      };
      const lines = await ocrRef.current.recognize(photo.base64, rect);
      const found = extractPrices(lines, rect.width, rect.height, sw, sh, wage);
      setTapResults(found);
    } catch (e: any) {
      setError(e?.message ?? 'Erro no OCR');
    } finally {
      setScanning(false);
    }
  }, [wage, screenW, screenH]);

  // --- Callbacks JS chamados pelos worklets ---
  const onDrawStart = useCallback((ax: number, ay: number) => {
    setSelRect({ x: ax, y: ay, w: 0, h: 0 });
    setTapResults(null);
  }, []);

  const onDrawMove = useCallback((ax: number, ay: number, tx: number, ty: number) => {
    setSelRect({
      x: Math.min(ax, ax + tx),
      y: Math.min(ay, ay + ty),
      w: Math.abs(tx),
      h: Math.abs(ty),
    });
  }, []);

  const onDrawEnd = useCallback((ax: number, ay: number, tx: number, ty: number) => {
    const w = Math.abs(tx);
    const h = Math.abs(ty);
    if (w < 20 || h < 20) { setSelRect(null); return; }
    const x = Math.min(ax, ax + tx);
    const y = Math.min(ay, ay + ty);
    runRegionOCR(x, y, w, h);
  }, [runRegionOCR]);

  // --- Gestures combinados: pinch (2 dedos) + pan (1 dedo, só no modo tap) ---
  const gestures = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onBegin(() => { savedZoom.value = zoomShared.value; })
      .onUpdate((e) => {
        zoomShared.value = Math.max(0, Math.min(1, savedZoom.value + (e.scale - 1) * 0.25));
      });

    const pan = Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .minDistance(8)
      .enabled(mode === 'tap')
      .onBegin((e) => { runOnJS(onDrawStart)(e.absoluteX, e.absoluteY); })
      .onUpdate((e) => { runOnJS(onDrawMove)(e.absoluteX - e.translationX, e.absoluteY - e.translationY, e.translationX, e.translationY); })
      .onEnd((e)   => { runOnJS(onDrawEnd)(e.absoluteX - e.translationX, e.absoluteY - e.translationY, e.translationX, e.translationY); });

    return Gesture.Simultaneous(pinch, pan);
  }, [mode, onDrawStart, onDrawMove, onDrawEnd]);

  if (!permission) return <View style={styles.center}><ActivityIndicator color="#fff" /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Permissao de camera necessaria</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusText = !ocrReady
    ? 'Carregando OCR...'
    : scanning ? 'Analisando...'
    : mode === 'tap'
      ? 'Arraste para selecionar uma área'
      : detections.length > 0
        ? `${detections.length} preco${detections.length > 1 ? 's' : ''} convertido${detections.length > 1 ? 's' : ''}`
        : 'Aponte para precos com € $ £ R$ ¥ ₹';

  return (
    <GestureDetector gesture={gestures}>
      <View style={styles.container}>
        <TesseractOCR ref={ocrRef} />

        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          zoom={zoom}
        />

        {/* Replace mode: boxes automáticos */}
        {mode === 'replace' && wage && netWage && (
          <PriceOverlay
            detections={detections}
            wage={wage}
            netWage={netWage}
            currency={currency}
            taxRate={taxRate}
            mode="replace"
          />
        )}

        {/* Tap mode: retângulo de seleção */}
        {mode === 'tap' && selRect && selRect.w > 4 && selRect.h > 4 && (
          <View
            pointerEvents="none"
            style={[styles.selRect, { left: selRect.x, top: selRect.y, width: selRect.w, height: selRect.h }]}
          />
        )}

        {/* Card de resultado */}
        {mode === 'tap' && tapResults !== null && wage && netWage && (
          <View style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.handle} />
              {tapResults.length === 0 ? (
                <Text style={styles.cardEmpty}>Nenhum preço encontrado nessa área</Text>
              ) : (
                tapResults.map((d) => {
                  const netMin = Math.round((d.value / netWage) * 60);
                  return (
                    <View key={d.id} style={styles.cardItem}>
                      <Text style={styles.cardPrice}>{d.originalText}</Text>
                      <Text style={styles.cardTime}>{formatMinutes(netMin)}</Text>
                      {taxRate > 0 && (
                        <Text style={styles.cardTaxNote}>
                          sem imposto: {formatMinutes(d.minutes)} · {Math.round(taxRate * 100)}% impostos
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
              <Text style={styles.cardWage}>
                {currency}{netWage.toFixed(2)}/h líquido{taxRate > 0 ? ` (bruto ${currency}${wage}/h)` : ''}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => { setTapResults(null); setSelRect(null); }}>
                <Text style={styles.closeBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.push('/wage')} style={styles.salaryChip}>
            <Text style={styles.salaryIcon}>⏱</Text>
            <Text style={styles.salaryText}>
              {wage !== null ? `${currency}${wage}/h` : 'Definir salário'}
            </Text>
          </TouchableOpacity>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'replace' && styles.modeBtnActive]}
              onPress={() => setMode('replace')}
            >
              <Text style={[styles.modeBtnText, mode === 'replace' && styles.modeBtnTextActive]}>Auto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'tap' && styles.modeBtnActive]}
              onPress={() => { setMode('tap'); setTapResults(null); setSelRect(null); }}
            >
              <Text style={[styles.modeBtnText, mode === 'tap' && styles.modeBtnTextActive]}>Selecionar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanIndicator}>
            {(scanning || !ocrReady) ? (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
            ) : (
              <View style={[styles.dot, detections.length > 0 && styles.dotActive]} />
            )}
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusBar}>
          <Text style={[styles.statusText, !!error && styles.statusError]}>
            {error ?? statusText}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const AMBER = '#F59E0B';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 },
  permText: { color: '#fff', fontSize: 17, textAlign: 'center', paddingHorizontal: 32 },
  btn: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  btnText: { color: '#000', fontWeight: '700', fontSize: 16 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingHorizontal: 14, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  salaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  salaryIcon: { fontSize: 12 },
  salaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  modeToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 13 },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  modeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  modeBtnTextActive: { color: '#fff' },

  scanIndicator: { width: 24, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: '#4ade80' },

  selRect: {
    position: 'absolute',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 6, borderStyle: 'dashed',
  },

  card: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  cardInner: {
    backgroundColor: '#0f0f0f', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 14, paddingBottom: 44, paddingHorizontal: 28, alignItems: 'center',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 4,
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  cardItem: { alignItems: 'center', marginBottom: 8 },
  cardPrice: { color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 2 },
  cardTime: { color: '#fff', fontSize: 52, fontWeight: '800', letterSpacing: -1.5 },
  cardTaxNote: { color: AMBER, fontSize: 12, marginTop: 4, textAlign: 'center' },
  cardEmpty: { color: 'rgba(255,255,255,0.4)', fontSize: 16, marginVertical: 20 },
  cardWage: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginBottom: 20 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 12 },
  closeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },

  statusBar: { position: 'absolute', bottom: 28, alignSelf: 'center' },
  statusText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  statusError: { color: '#f87171' },
});
