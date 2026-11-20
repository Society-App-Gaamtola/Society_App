import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AppNotification, EventDraft, Notice, SocietyEvent } from '../types';

/** Screens pushed inside a tab so the bottom tab bar stays visible. */
export type SharedStackParams = {
  NoticeBoard: undefined;
  EventCalendar: undefined;
  ExecutiveRequest: undefined;
  SocietyExpenses: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
  /** draft: a copy to start from (duplicate) or the event being edited (editId) */
  CreateEvent: { draft?: EventDraft; editId?: number } | undefined;
  MyEvents: undefined;
  EventPreview: { event: EventDraft; editId?: number };
  /** noticeId: edit that notice (own, any status) */
  PostNotice: { noticeId?: number } | undefined;
  MyNotices: undefined;
  EventPlanning: undefined;
  /** expenseId: edit that expense. categories: the society's list, passed by Society Expenses */
  AddExpense: { expenseId?: number; categories?: string[] } | undefined;
  MediaApproval: undefined;
  DonationEntries: undefined;
  AddDonation: { donationId?: number } | undefined;
  FinancialReports: undefined;
  ExportReports: undefined;
  /** `notice` is the copy the list already has, shown at once; the screen then loads the full notice from the API. */
  NoticeDetails: { noticeId: string; notice?: Notice };
  Notifications: undefined;
  NotificationDetails: { notification: AppNotification };
  MyDonations: undefined;
  MemberDirectory: undefined;
  /** `event` is the copy the list already has, shown at once; the screen then loads the full event from the API. */
  EventDetails: { eventId: string; event?: SocietyEvent };
};

export type HomeStackParamList = { HomeMain: undefined } & SharedStackParams;
export type EventsStackParamList = { EventsMain: undefined } & SharedStackParams;
export type DonateStackParamList = { DonateMain: undefined } & SharedStackParams;
export type ProfileStackParamList = { ProfileMain: undefined } & SharedStackParams;

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Gallery: undefined;
  Donate: NavigatorScreenParams<DonateStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LanguageSelect: undefined;
  Login: undefined;
  Register: undefined;
  Otp: {
    mode: 'login' | 'register' | 'email_change';
    /** Where the code was mailed. */
    email?: string;
    /** Carried over to the Profile & Address step (register). */
    name?: string;
    /** Seconds until a new code can be requested. */
    resendAfter?: number;
  };
  ProfileSetup: { phone?: string; name?: string } | undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};
