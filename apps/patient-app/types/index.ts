export * from './auth';
export * from './api';
export * from './common';
export * from './settings';
export * from './sync';

// Navigation types
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  onboarding: undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
  'link-professional': undefined;
};

export type MainTabsParamList = {
  index: undefined;
  exercises: undefined;
  appointments: undefined;
  progress: undefined;
  profile: undefined;
  settings: undefined;
};
