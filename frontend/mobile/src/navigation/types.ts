import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NewExecEvent } from '../events/EventsContext';

/** Screens pushed inside a tab so the bottom tab bar stays visible. */
type SharedStackParams = {
  NoticeBoard: undefined;
  EventCalendar: undefined;
  Volunteer: undefined;
  ExecutiveRequest: undefined;
  SocietyExpenses: undefined;
  Settings: undefined;
  CreateEvent: undefined;
  MyEvents: undefined;
  EventPreview: { event: NewExecEvent };
  DonationEntries: undefined;
  AddDonation: { donationId?: string } | undefined;
  FinancialReports: undefined;
  ExportReports: undefined;
  NoticeDetails: { noticeId: string };
  EventDetails: { eventId: string };
};

export type HomeStackParamList = { HomeMain: undefined } & SharedStackParams;
export type EventsStackParamList = { EventsMain: undefined } & SharedStackParams;

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Gallery: undefined;
  Donate: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LanguageSelect: undefined;
  Login: undefined;
  Register: undefined;
  Otp: { phone?: string; mode: 'login' | 'register'; name?: string };
  ProfileSetup: { phone?: string; name?: string } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};
