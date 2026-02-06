export const Y_BALANCE_KEYS = ['anterior', 'posteromedial', 'posterolateral'] as const;

export type YBalanceKey = (typeof Y_BALANCE_KEYS)[number];

export interface YBalanceValues {
  anterior: string;
  posteromedial: string;
  posterolateral: string;
}
