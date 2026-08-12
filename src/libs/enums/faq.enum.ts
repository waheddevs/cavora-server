export enum FaqSection {
  OVERVIEW = 'OVERVIEW',
  PAYMENTS = 'PAYMENTS',
  SAFETY = 'SAFETY',
}

export enum FaqStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export const faqSectionTitles: Record<FaqSection, string> = {
  [FaqSection.OVERVIEW]: 'Overview',
  [FaqSection.PAYMENTS]: 'Costs and payments',
  [FaqSection.SAFETY]: 'Safety and Security',
};
