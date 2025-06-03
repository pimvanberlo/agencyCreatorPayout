export interface VATRate {
  country: string;
  rate: number;
  countryName: string;
}

export const VAT_RATES: VATRate[] = [
  { country: 'AT', rate: 0.20, countryName: 'Austria' },
  { country: 'BE', rate: 0.21, countryName: 'Belgium' },
  { country: 'BG', rate: 0.20, countryName: 'Bulgaria' },
  { country: 'HR', rate: 0.25, countryName: 'Croatia' },
  { country: 'CY', rate: 0.19, countryName: 'Cyprus' },
  { country: 'CZ', rate: 0.21, countryName: 'Czech Republic' },
  { country: 'DK', rate: 0.25, countryName: 'Denmark' },
  { country: 'EE', rate: 0.20, countryName: 'Estonia' },
  { country: 'FI', rate: 0.24, countryName: 'Finland' },
  { country: 'FR', rate: 0.20, countryName: 'France' },
  { country: 'DE', rate: 0.19, countryName: 'Germany' },
  { country: 'GR', rate: 0.24, countryName: 'Greece' },
  { country: 'HU', rate: 0.27, countryName: 'Hungary' },
  { country: 'IE', rate: 0.23, countryName: 'Ireland' },
  { country: 'IT', rate: 0.22, countryName: 'Italy' },
  { country: 'LV', rate: 0.21, countryName: 'Latvia' },
  { country: 'LT', rate: 0.21, countryName: 'Lithuania' },
  { country: 'LU', rate: 0.17, countryName: 'Luxembourg' },
  { country: 'MT', rate: 0.18, countryName: 'Malta' },
  { country: 'NL', rate: 0.21, countryName: 'Netherlands' },
  { country: 'PL', rate: 0.23, countryName: 'Poland' },
  { country: 'PT', rate: 0.23, countryName: 'Portugal' },
  { country: 'RO', rate: 0.19, countryName: 'Romania' },
  { country: 'SK', rate: 0.20, countryName: 'Slovakia' },
  { country: 'SI', rate: 0.22, countryName: 'Slovenia' },
  { country: 'ES', rate: 0.21, countryName: 'Spain' },
  { country: 'SE', rate: 0.25, countryName: 'Sweden' },
  // Non-EU countries (no VAT for non-EU businesses)
  { country: 'US', rate: 0.00, countryName: 'United States' },
  { country: 'GB', rate: 0.00, countryName: 'United Kingdom' },
  { country: 'CA', rate: 0.00, countryName: 'Canada' },
  { country: 'AU', rate: 0.00, countryName: 'Australia' },
  { country: 'JP', rate: 0.00, countryName: 'Japan' },
  { country: 'SG', rate: 0.00, countryName: 'Singapore' },
  { country: 'CH', rate: 0.00, countryName: 'Switzerland' },
  { country: 'NO', rate: 0.00, countryName: 'Norway' },
];

export function calculateVAT(amount: number, country: string, businessType: string) {
  const vatRate = VAT_RATES.find(rate => rate.country === country);
  
  if (!vatRate) {
    // Default to no VAT for unknown countries
    return {
      rate: 0,
      amount: 0,
      total: amount,
      isEUVATShift: false
    };
  }

  // VAT shift logic for EU B2B transactions
  const isEU = vatRate.rate > 0;
  const isB2B = businessType === 'company';
  const isEUVATShift = isEU && isB2B;

  if (isEUVATShift) {
    // EU VAT shift - no VAT charged by payer
    return {
      rate: 0,
      amount: 0,
      total: amount,
      isEUVATShift: true
    };
  }

  // Regular VAT calculation
  const vatAmount = amount * vatRate.rate;
  
  return {
    rate: vatRate.rate,
    amount: vatAmount,
    total: amount + vatAmount,
    isEUVATShift: false
  };
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rate);
}