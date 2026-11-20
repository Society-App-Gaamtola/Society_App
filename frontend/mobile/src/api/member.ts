import { request } from './client';
import type { Pagination } from './user';
import type { McIconName } from '../icons';
import type { DonationMethod, DonationPurpose, MyDonation } from '../types';

// The member's own things (backend/modules/v1/module/memberModule.js): notifications, member directory,
// donations and the Executive Request.

/** "?page=2&search=x", leaving out empty values. */
const toQuery = (params: Record<string, string | number | boolean | undefined | null>) =>
  '?' +
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

// ---------- Notifications ----------

export type ApiNotificationType = 'event' | 'notice' | 'donation' | 'general';

export type ApiNotification = {
  id: number;
  type: ApiNotificationType;
  priority: 'normal' | 'high';
  /** Already in the app's language for system messages. */
  title: string;
  body: string;
  /** What it is about: an event, notice or gallery item (open it from the details screen). */
  ref_type: 'event' | 'notice' | 'media' | null;
  ref_id: number | null;
  created_at: string;
  is_read: 0 | 1;
  read_at: string | null;
};

export const getNotifications = (page: number, type?: ApiNotificationType) =>
  request<{ notifications: ApiNotification[]; unread_count: number; pagination: Pagination }>(
    'GET',
    `/user/notifications${toQuery({ page, type })}`,
  );

export const readNotification = (id: number) => request('PUT', `/user/notifications/${id}/read`);

export const readAllNotifications = () => request('PUT', '/user/notifications/read-all');

// ---------- Member directory ----------

export type ApiRole = 'super_admin' | 'executive' | 'member';

export type ApiMember = {
  id: number;
  name: string;
  member_code: string | null;
  role: ApiRole;
  photo_url: string | null;
  /** Null when the member keeps it private (executives always see it). */
  mobile: string | null;
  email: string | null;
};

export const getMembers = (page: number, filters: { search?: string; role?: ApiRole }) =>
  request<{ members: ApiMember[]; pagination: Pagination }>('GET', `/user/members${toQuery({ page, ...filters })}`);

// ---------- Donations ----------

export type ApiDonationMethod = 'upi_app' | 'upi_qr' | 'cash' | 'gateway';
export type ApiDonationStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export type ApiDonation = {
  id: number;
  amount: number;
  purpose: string | null;
  method: ApiDonationMethod;
  status: ApiDonationStatus;
  /** UPI transaction ID (UTR) or receipt number. */
  reference_no: string | null;
  note: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type DonationSettings = {
  /** Null until the admin adds the society's UPI ID. */
  upi: { payee_name: string; upi_id: string; qr_image_url: string | null; display_note: string | null } | null;
  purposes: string[];
  min_amount: number;
  max_amount: number;
  executive_min_donation: number;
};

export const DONATION_PURPOSE_ICON: Record<DonationPurpose, McIconName> = {
  Festival: 'firework',
  Aarti: 'candle',
  Cultural: 'drama-masks',
  'General Fund': 'bank-outline',
  Other: 'hand-heart',
};

export const METHOD_TO_API: Partial<Record<DonationMethod, Exclude<ApiDonationMethod, 'gateway'>>> = {
  'UPI App': 'upi_app',
  'QR Code': 'upi_qr',
  Cash: 'cash',
};
const METHOD_LABEL: Record<ApiDonationMethod, DonationMethod> = { upi_app: 'UPI App', upi_qr: 'QR Code', cash: 'Cash', gateway: 'Card' };
const STATUS_LABEL: Record<ApiDonationStatus, MyDonation['status']> = { pending: 'Pending', success: 'Successful', failed: 'Failed', cancelled: 'Failed' };

export const toMyDonation = (d: ApiDonation): MyDonation => {
  const purpose = (d.purpose ?? 'Other') as DonationPurpose;
  return {
    id: String(d.id),
    title: `${purpose} Donation`,
    date: d.confirmed_at ?? d.created_at,
    amount: d.amount,
    status: STATUS_LABEL[d.status],
    icon: DONATION_PURPOSE_ICON[purpose] ?? 'hand-heart',
    method: METHOD_LABEL[d.method],
    reference: d.reference_no ?? undefined,
  };
};

export const getDonationSettings = () => request<DonationSettings>('GET', '/user/donation-settings');

export const getMyDonations = (page = 1, limit = 50) =>
  request<{ donations: ApiDonation[]; summary: { total: number; this_year: number }; pagination: Pagination }>(
    'GET',
    `/user/donations${toQuery({ page, limit })}`,
  );

/** UPI app / QR need the 12-digit UTR; cash is paid at the office later. Saved as "pending" for the treasurer. */
export const createDonation = (body: { amount: number; purpose: string; method: Exclude<ApiDonationMethod, 'gateway'>; reference_no?: string }) =>
  request<{ donation: ApiDonation }>('POST', '/user/donations', { body });

// ---------- Executive Request ----------

export type ApiExecutiveApplication = {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  donation_amount: number;
  reference_no: string | null;
  reason: string | null;
  payment_proof_url: string | null;
  /** The admin's note when reviewing (e.g. why it was rejected). */
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export const getExecutiveRequest = () =>
  request<{ application: ApiExecutiveApplication | null; executive_min_donation: number }>('GET', '/user/executive-request');

export const createExecutiveRequest = (body: { donation_amount: number; reference_no: string; reason: string; payment_proof_url?: string }) =>
  request<{ application: ApiExecutiveApplication; executive_min_donation: number }>('POST', '/user/executive-request', { body });
