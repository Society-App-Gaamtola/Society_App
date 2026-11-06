import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NewExecEvent } from '../types';

/** Screens pushed inside a tab so the bottom tab bar stays visible. */
export type SharedStackParams = {
  NoticeBoard: undefined;
  EventCalendar: undefined;
  Volunteer: undefined;
  ExecutiveRequest: undefined;
  SocietyExpenses: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
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
  Otp: {
    mode: 'login' | 'register' | 'email_change';
    /** Where the code was mailed (register and email_change). */
    email?: string;
    /** The number as typed, for display (login). */
    phone?: string;
    country_code?: string;
    mobile_number?: string;
    /** Carried over to the Profile & Address step (register). */
    name?: string;
    /** Seconds until a new code can be requested. */
    resendAfter?: number;
  };
  ProfileSetup: { phone?: string; name?: string } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};
