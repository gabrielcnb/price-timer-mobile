// Alíquotas efetivas médias de imposto de renda 2026
// Fonte: Revenue.ie, Gov.br, PwC Tax Summaries, Belastingdienst, GOV.UK
// Inclui: IR + contribuições sociais obrigatórias do empregado (não empregador)
export interface Country {
  code: string;
  name: string;
  flag: string;
  rate: number;   // alíquota efetiva total (ex: 0.27 = 27%)
  symbol: string; // símbolo de moeda padrão
}

export const COUNTRIES: Country[] = [
  // Alíquotas efetivas calculadas para salário médio de cada país (2026)
  // Irlanda: IR 20% - tax credits €4,000 + USC + PRSI 4.2% + auto-enrolment 1.5% → ~19%
  { code: 'IE', name: 'Irlanda',       flag: '🇮🇪', rate: 0.19, symbol: '€'  },
  // Portugal: IRS - dedução específica €4,104 + crédito pessoal €1,678 + SS 11% → ~17%
  { code: 'PT', name: 'Portugal',      flag: '🇵🇹', rate: 0.17, symbol: '€'  },
  // Brasil: 2026 IR zerado até R$5k/mês (nova tabela) + INSS progressivo → ~9%
  { code: 'BR', name: 'Brasil',        flag: '🇧🇷', rate: 0.09, symbol: 'R$' },
  // UK: Income Tax 20% - personal allowance £12,570 + NI 8% → ~18%
  { code: 'GB', name: 'Reino Unido',   flag: '🇬🇧', rate: 0.18, symbol: '£'  },
  // Alemanha: Einkommensteuer + SS employee (KV+RV+AV+PV ~20.55%) sem Soli → ~33%
  { code: 'DE', name: 'Alemanha',      flag: '🇩🇪', rate: 0.33, symbol: '€'  },
  // França: IR + CSG/CRDS + retraite complémentaire (chômage employee = 0% desde 2018) → ~26%
  { code: 'FR', name: 'França',        flag: '🇫🇷', rate: 0.26, symbol: '€'  },
  // Espanha: IRPF + SS employee 6.35% → ~24%
  { code: 'ES', name: 'Espanha',       flag: '🇪🇸', rate: 0.24, symbol: '€'  },
  // Itália: IRPEF + contributi previdenziali employee ~9.49% → ~27%
  { code: 'IT', name: 'Itália',        flag: '🇮🇹', rate: 0.27, symbol: '€'  },
  // Holanda: Box 1 inclui IR + seguridade nacional + créditos arbeidskorting/heffingskorting → ~19%
  { code: 'NL', name: 'Holanda',       flag: '🇳🇱', rate: 0.19, symbol: '€'  },
  // Bélgica: IPP + cotisations sociales employee ~13.07% → ~38%
  { code: 'BE', name: 'Bélgica',       flag: '🇧🇪', rate: 0.38, symbol: '€'  },
  // Áustria: ESt + SV-Beiträge employee ~18.12% → ~30%
  { code: 'AT', name: 'Áustria',       flag: '🇦🇹', rate: 0.30, symbol: '€'  },
  // Suíça: cantão médio + federal + AHV/IV/EO employee ~6.575% → ~18%
  { code: 'CH', name: 'Suíça',         flag: '🇨🇭', rate: 0.18, symbol: 'CHF'},
  // Suécia: kommunalskatt ~32% + statlig + ATP → ~40%
  { code: 'SE', name: 'Suécia',        flag: '🇸🇪', rate: 0.40, symbol: 'kr' },
  // Noruega: inntektsskatt + trygdeavgift 7.9% → ~27%
  { code: 'NO', name: 'Noruega',       flag: '🇳🇴', rate: 0.27, symbol: 'kr' },
  // Dinamarca: personskat + AM-bidrag 8% (sem SS separado) → ~36%
  { code: 'DK', name: 'Dinamarca',     flag: '🇩🇰', rate: 0.36, symbol: 'kr' },
  // Finlândia: ansiotulovero + SS employee ~8.65% → ~30%
  { code: 'FI', name: 'Finlândia',     flag: '🇫🇮', rate: 0.30, symbol: '€'  },
  // EUA: federal 16% + FICA 7.65% + média estadual ~5% → ~22%
  { code: 'US', name: 'EUA',           flag: '🇺🇸', rate: 0.22, symbol: '$'  },
  // Canadá: federal + provincial médio + CPP/EI → ~23%
  { code: 'CA', name: 'Canadá',        flag: '🇨🇦', rate: 0.23, symbol: '$'  },
  // Austrália: income tax + Medicare 2% → ~21%
  { code: 'AU', name: 'Austrália',     flag: '🇦🇺', rate: 0.21, symbol: '$'  },
  // Nova Zelândia: PAYE + ACC levy → ~19%
  { code: 'NZ', name: 'Nova Zelândia', flag: '🇳🇿', rate: 0.19, symbol: '$'  },
  // Japão: shotokuzei + juuminzei + kenko/nenkin employee → ~22%
  { code: 'JP', name: 'Japão',         flag: '🇯🇵', rate: 0.22, symbol: '¥'  },
  // Polónia: PIT 12% + ZUS employee → ~21%
  { code: 'PL', name: 'Polónia',       flag: '🇵🇱', rate: 0.21, symbol: 'zł' },
  { code: 'OTHER', name: 'Outro (sem imposto)', flag: '🌍', rate: 0, symbol: '€' },
];

export function getCountry(code: string): Country {
  return COUNTRIES.find(c => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1];
}
