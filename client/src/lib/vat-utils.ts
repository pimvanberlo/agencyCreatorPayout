export interface VATRate {
  country: string;
  rate: number;
  countryName: string;
}

export const VAT_RATES: VATRate[] = [
  { country: 'NL', rate: 21, countryName: 'Netherlands' },
  { country: 'DE', rate: 19, countryName: 'Germany' },
  { country: 'FR', rate: 20, countryName: 'France' },
  { country: 'BE', rate: 21, countryName: 'Belgium' },
  { country: 'ES', rate: 21, countryName: 'Spain' },
  { country: 'IT', rate: 22, countryName: 'Italy' },
  { country: 'UK', rate: 20, countryName: 'United Kingdom' },
  { country: 'US', rate: 0, countryName: 'United States' },
];

export function calculateVAT(amount: number, country: string, businessType: string) {
  const vatRate = VAT_RATES.find(r => r.country === country);
  
  // EU VAT reverse charge for VAT registered businesses
  if (businessType === 'vat_registered' && vatRate && country !== 'NL') {
    return { rate: 0, amount: 0, note: 'EU VAT Reverse Charge' };
  }

  // VAT exempt businesses
  if (businessType === 'vat_exempt') {
    return { rate: 0, amount: 0, note: 'VAT Exempt' };
  }

  const rate = vatRate?.rate || 0;
  const vatAmount = (amount * rate) / 100;

  return { 
    rate, 
    amount: vatAmount, 
    note: rate > 0 ? `${rate}% VAT (${vatRate?.countryName})` : 'No VAT applicable'
  };
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatPercent(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
