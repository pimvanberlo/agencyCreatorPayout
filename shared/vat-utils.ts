export interface VATRate {
  country: string;
  countryName: string;
  isEU: boolean;
}

export const VAT_RATES: VATRate[] = [
  // EU Countries
  { country: 'AT', countryName: 'Austria', isEU: true },
  { country: 'BE', countryName: 'Belgium', isEU: true },
  { country: 'BG', countryName: 'Bulgaria', isEU: true },
  { country: 'HR', countryName: 'Croatia', isEU: true },
  { country: 'CY', countryName: 'Cyprus', isEU: true },
  { country: 'CZ', countryName: 'Czech Republic', isEU: true },
  { country: 'DK', countryName: 'Denmark', isEU: true },
  { country: 'EE', countryName: 'Estonia', isEU: true },
  { country: 'FI', countryName: 'Finland', isEU: true },
  { country: 'FR', countryName: 'France', isEU: true },
  { country: 'DE', countryName: 'Germany', isEU: true },
  { country: 'GR', countryName: 'Greece', isEU: true },
  { country: 'HU', countryName: 'Hungary', isEU: true },
  { country: 'IE', countryName: 'Ireland', isEU: true },
  { country: 'IT', countryName: 'Italy', isEU: true },
  { country: 'LV', countryName: 'Latvia', isEU: true },
  { country: 'LT', countryName: 'Lithuania', isEU: true },
  { country: 'LU', countryName: 'Luxembourg', isEU: true },
  { country: 'MT', countryName: 'Malta', isEU: true },
  { country: 'NL', countryName: 'Netherlands', isEU: true },
  { country: 'PL', countryName: 'Poland', isEU: true },
  { country: 'PT', countryName: 'Portugal', isEU: true },
  { country: 'RO', countryName: 'Romania', isEU: true },
  { country: 'SK', countryName: 'Slovakia', isEU: true },
  { country: 'SI', countryName: 'Slovenia', isEU: true },
  { country: 'ES', countryName: 'Spain', isEU: true },
  { country: 'SE', countryName: 'Sweden', isEU: true },
  // Non-EU Countries
  { country: 'US', countryName: 'United States', isEU: false },
  { country: 'GB', countryName: 'United Kingdom', isEU: false },
  { country: 'CA', countryName: 'Canada', isEU: false },
  { country: 'AU', countryName: 'Australia', isEU: false },
  { country: 'JP', countryName: 'Japan', isEU: false },
  { country: 'SG', countryName: 'Singapore', isEU: false },
  { country: 'CH', countryName: 'Switzerland', isEU: false },
  { country: 'NO', countryName: 'Norway', isEU: false },
  { country: 'IN', countryName: 'India', isEU: false },
  { country: 'BR', countryName: 'Brazil', isEU: false },
];

// EU country codes for quick lookup
const EU_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", 
  "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", 
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", 
  "SI", "ES", "SE"
]);

export function calculateVAT(amount: number, countryCode: string, businessType: string) {
  const isDutchVatRegistered = countryCode === 'NL' && businessType === 'vat_registered';
  const isEUNonDutchVatRegistered = 
    EU_COUNTRY_CODES.has(countryCode) && 
    countryCode !== 'NL' && 
    businessType === 'vat_registered';

  // Scenario 1: Dutch VAT registered companies - 21% VAT
  if (isDutchVatRegistered) {
    const rate = 0.21; // 21% VAT
    const vatAmount = amount * rate;
    return {
      rate: rate,
      amount: vatAmount,
      total: amount + vatAmount,
      isEUVATShift: false,
      note: "Dutch VAT (21%) applied."
    };
  }

  // Scenario 2: EU (except Dutch) VAT registered companies - VAT shifted
  if (isEUNonDutchVatRegistered) {
    return {
      rate: 0,
      amount: 0,
      total: amount,
      isEUVATShift: true,
      note: "EU VAT reverse charge (VAT shifted)."
    };
  }

  // Scenario 3: Outside EU companies, VAT exempt companies, or individuals - No VAT
  // This covers:
  // - Non-EU companies (businessType === 'vat_registered' but countryCode is not in EU)
  // - All 'vat_exempt' companies (regardless of country)
  // - All 'individual's (regardless of country)
  return {
    rate: 0,
    amount: 0,
    total: amount,
    isEUVATShift: false,
    note: "No VAT applicable."
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