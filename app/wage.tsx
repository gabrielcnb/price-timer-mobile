import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useWage } from '../hooks/useWage';
import { COUNTRIES, type Country } from '../utils/taxData';

export default function WageScreen() {
  const { wage: savedWage, currency: savedCurrency, countryCode: savedCC, saveWage } = useWage();
  const [amount, setAmount] = useState(savedWage ? savedWage.toString() : '');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === savedCC) ?? COUNTRIES[0]
  );
  const [search, setSearch] = useState('');

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value || value <= 0) return;
    await saveWage(value, selectedCountry.symbol, selectedCountry.code, selectedCountry.rate);
    router.replace('/camera');
  };

  const isValid = parseFloat(amount.replace(',', '.')) > 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Configurar salário</Text>

        {/* Salário */}
        <View style={styles.section}>
          <Text style={styles.label}>Salário bruto por hora</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyLabel}>{selectedCountry.symbol}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.2)"
              returnKeyType="done"
            />
            <Text style={styles.perHour}>/h</Text>
          </View>
        </View>

        {/* País */}
        <View style={styles.section}>
          <Text style={styles.label}>País (para cálculo de impostos)</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar país..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView style={styles.countryList} nestedScrollEnabled>
            {filtered.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryRow, selectedCountry.code === c.code && styles.countryRowSelected]}
                onPress={() => setSelectedCountry(c)}
                activeOpacity={0.7}
              >
                <Text style={styles.countryFlag}>{c.flag}</Text>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryName}>{c.name}</Text>
                  <Text style={styles.countryTax}>
                    {c.rate > 0 ? `~${Math.round(c.rate * 100)}% imposto` : 'Sem imposto'}
                  </Text>
                </View>
                {selectedCountry.code === c.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Preview */}
        {isValid && (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              Bruto: {selectedCountry.symbol}{parseFloat(amount.replace(',', '.'))}/h
            </Text>
            <Text style={styles.previewNet}>
              Líquido: {selectedCountry.symbol}{(parseFloat(amount.replace(',', '.')) * (1 - selectedCountry.rate)).toFixed(2)}/h
              {selectedCountry.rate > 0 && ` (−${Math.round(selectedCountry.rate * 100)}%)`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Salvar e continuar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  inner: { padding: 24, paddingTop: Platform.OS === 'ios' ? 64 : 24, gap: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 4 },

  section: { gap: 10 },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencyLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 28, fontWeight: '300', minWidth: 28 },
  input: {
    flex: 1, color: '#fff', fontSize: 44, fontWeight: '300',
    borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.2)', paddingBottom: 4,
  },
  perHour: { color: 'rgba(255,255,255,0.3)', fontSize: 18 },

  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, padding: 10, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  countryList: { maxHeight: 220, borderRadius: 12, overflow: 'hidden' },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10,
  },
  countryRowSelected: { backgroundColor: 'rgba(255,255,255,0.08)' },
  countryFlag: { fontSize: 22 },
  countryInfo: { flex: 1 },
  countryName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  countryTax: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 },
  checkmark: { color: '#4ade80', fontSize: 16, fontWeight: '700' },

  preview: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 14, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  previewText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  previewNet: { color: '#fff', fontSize: 16, fontWeight: '600' },

  button: { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.25 },
  buttonText: { color: '#000', fontSize: 17, fontWeight: '700' },
});
