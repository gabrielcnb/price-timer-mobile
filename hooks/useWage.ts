import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';

export type Currency = '€' | '$' | string;

export interface WageData {
  wage: number | null;
  currency: Currency;
  countryCode: string | null;
  taxRate: number;  // 0-1
  netWage: number | null; // wage * (1 - taxRate)
  loaded: boolean;
  saveWage: (amount: number, curr: Currency, countryCode: string, taxRate: number) => Promise<void>;
}

export function useWage(): WageData {
  const [wage, setWage] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>('€');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [w, c, cc, tr] = await Promise.all([
        SecureStore.getItemAsync('wage'),
        SecureStore.getItemAsync('currency'),
        SecureStore.getItemAsync('countryCode'),
        SecureStore.getItemAsync('taxRate'),
      ]);
      if (w) setWage(parseFloat(w));
      if (c) setCurrency(c);
      if (cc) setCountryCode(cc);
      if (tr) setTaxRate(parseFloat(tr));
      setLoaded(true);
    })();
  }, []);

  const saveWage = async (amount: number, curr: Currency, cc: string, tr: number) => {
    await Promise.all([
      SecureStore.setItemAsync('wage', amount.toString()),
      SecureStore.setItemAsync('currency', curr),
      SecureStore.setItemAsync('countryCode', cc),
      SecureStore.setItemAsync('taxRate', tr.toString()),
    ]);
    setWage(amount);
    setCurrency(curr);
    setCountryCode(cc);
    setTaxRate(tr);
  };

  const netWage = wage !== null ? wage * (1 - taxRate) : null;

  return { wage, currency, countryCode, taxRate, netWage, loaded, saveWage };
}
