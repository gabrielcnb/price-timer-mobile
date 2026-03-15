import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, PanResponder,
} from 'react-native';
import type { PriceDetection } from '../utils/priceParser';
import { formatMinutes } from '../utils/priceParser';

export type OverlayMode = 'replace' | 'tap';

interface Props {
  detections: PriceDetection[];
  wage: number;
  netWage: number;
  currency: string;
  taxRate: number;
  mode: OverlayMode;
}

// ─── Replace mode box ───────────────────────────────────────────────────────
function ReplaceBox({ detection, netWage }: { detection: PriceDetection; netWage: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, []);

  const netMinutes = Math.round((detection.value / netWage) * 60);
  const { frame } = detection;

  return (
    <Animated.View style={[styles.replaceBox, {
      opacity: anim, left: frame.x - 4, top: frame.y - 4,
      minWidth: frame.width + 8, minHeight: frame.height + 8,
    }]}>
      <Text style={styles.replaceTime} numberOfLines={1} adjustsFontSizeToFit>
        {formatMinutes(netMinutes)}
      </Text>
    </Animated.View>
  );
}

// ─── Tap mode box ────────────────────────────────────────────────────────────
function TapBox({ detection, selected, highlighted, onPress }: {
  detection: PriceDetection;
  selected: boolean;
  highlighted: boolean;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  }, []);

  const { frame } = detection;
  const active = selected || highlighted;

  return (
    <Animated.View style={[styles.tapWrap, {
      opacity: anim, left: frame.x - 6, top: frame.y - 6,
      width: Math.max(frame.width + 12, 56), height: Math.max(frame.height + 12, 28),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
    }]}>
      <TouchableOpacity
        style={[styles.tapBox, active && styles.tapBoxActive]}
        onPress={onPress} activeOpacity={0.75}
      >
        <Text style={[styles.tapLabel, active && styles.tapLabelActive]} numberOfLines={1}>
          {formatMinutes(detection.minutes)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Price card ──────────────────────────────────────────────────────────────
function PriceCard({ detections, wage, netWage, currency, taxRate, onClose }: {
  detections: PriceDetection[];
  wage: number;
  netWage: number;
  currency: string;
  taxRate: number;
  onClose: () => void;
}) {
  const slide = useRef(new Animated.Value(260)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
  }, []);

  const hasTax = taxRate > 0;

  return (
    <Animated.View style={[styles.card, { transform: [{ translateY: slide }] }]}>
      <View style={styles.cardInner}>
        <View style={styles.handle} />

        {detections.map((d) => {
          const grossMin = d.minutes;
          const netMin = Math.round((d.value / netWage) * 60);
          return (
            <View key={d.id} style={styles.cardItem}>
              <Text style={styles.cardPrice}>{d.originalText}</Text>
              <Text style={styles.cardTime}>{formatMinutes(netMin)}</Text>
              {hasTax && (
                <Text style={styles.cardTaxNote}>
                  sem imposto seriam {formatMinutes(grossMin)} · {Math.round(taxRate * 100)}% impostos
                </Text>
              )}
            </View>
          );
        })}

        <Text style={styles.cardWage}>
          {currency}{netWage.toFixed(2)}/h líquido
          {hasTax ? ` (bruto ${currency}${wage}/h)` : ''}
        </Text>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Helpers de intersecção ───────────────────────────────────────────────────
function rectsIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export function PriceOverlay({ detections, wage, netWage, currency, taxRate, mode }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // Limpa seleção quando muda o scan
  useEffect(() => {
    const ids = new Set(detections.map(d => d.id));
    setSelectedIds(prev => new Set([...prev].filter(id => ids.has(id))));
    setHighlightedIds(prev => new Set([...prev].filter(id => ids.has(id))));
  }, [detections]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => mode === 'tap',
    onMoveShouldSetPanResponder: (_, gs) =>
      mode === 'tap' && (Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6),

    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      dragStart.current = { x: pageX, y: pageY };
      isDragging.current = false;
    },

    onPanResponderMove: (_, gs) => {
      if (Math.abs(gs.dx) < 6 && Math.abs(gs.dy) < 6) return;
      isDragging.current = true;
      const x = Math.min(dragStart.current.x, dragStart.current.x + gs.dx);
      const y = Math.min(dragStart.current.y, dragStart.current.y + gs.dy);
      setSelRect({ x, y, w: Math.abs(gs.dx), h: Math.abs(gs.dy) });
    },

    onPanResponderRelease: (_, gs) => {
      if (!isDragging.current) {
        // foi um tap simples — sem ação aqui, o TouchableOpacity da box trata
        setSelRect(null);
        return;
      }
      // Seleciona todas as detections que intersectam o rect de seleção
      const x = Math.min(dragStart.current.x, dragStart.current.x + gs.dx);
      const y = Math.min(dragStart.current.y, dragStart.current.y + gs.dy);
      const w = Math.abs(gs.dx);
      const h = Math.abs(gs.dy);

      const found = detections.filter(d =>
        rectsIntersect(x, y, w, h, d.frame.x, d.frame.y, d.frame.width, d.frame.height)
      );
      if (found.length > 0) {
        setHighlightedIds(new Set(found.map(d => d.id)));
        setSelectedIds(new Set(found.map(d => d.id)));
      }
      setSelRect(null);
    },
  }), [mode, detections]);

  const cardDetections = detections.filter(d => selectedIds.has(d.id));
  const showCard = cardDetections.length > 0;

  if (mode === 'replace') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {detections.map(d => <ReplaceBox key={d.id} detection={d} netWage={netWage} />)}
      </View>
    );
  }

  return (
    <>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none" {...panResponder.panHandlers}>
        {/* Retângulo de seleção */}
        {selRect && (
          <View style={[styles.selRect, {
            left: selRect.x, top: selRect.y,
            width: selRect.w, height: selRect.h,
          }]} pointerEvents="none" />
        )}

        {detections.map(d => (
          <TapBox
            key={d.id}
            detection={d}
            selected={selectedIds.has(d.id)}
            highlighted={highlightedIds.has(d.id)}
            onPress={() => {
              setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                return next;
              });
            }}
          />
        ))}
      </View>

      {showCard && (
        <PriceCard
          detections={cardDetections}
          wage={wage}
          netWage={netWage}
          currency={currency}
          taxRate={taxRate}
          onClose={() => { setSelectedIds(new Set()); setHighlightedIds(new Set()); }}
        />
      )}
    </>
  );
}

const AMBER = '#F59E0B';

const styles = StyleSheet.create({
  replaceBox: {
    position: 'absolute', backgroundColor: '#fffbeb',
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  replaceTime: { color: '#111', fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },

  tapWrap: { position: 'absolute' },
  tapBox: {
    flex: 1, borderRadius: 8, borderWidth: 2, borderColor: AMBER,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  tapBoxActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.18)' },
  tapLabel: { color: AMBER, fontSize: 10, fontWeight: '700' },
  tapLabelActive: { color: '#fff' },

  selRect: {
    position: 'absolute',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    borderStyle: 'dashed',
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

  cardWage: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginBottom: 20 },
  closeBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 12 },
  closeBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },
});
