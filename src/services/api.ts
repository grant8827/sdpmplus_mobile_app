import { Platform } from 'react-native';
import type { AuthSession, Child, LoginResult, Notice, QueueItem, SentNotice } from '../types';
import { APP_VERSION } from '../appVersion';

// Which backend the app signs in to. The live server (Railway) by default —
// in development builds too — so the same accounts work as on the website.
// To test against the backend running on this computer (`npm run dev` in
// backend/, with its local demo accounts), set USE_LOCAL_BACKEND to true.
const USE_LOCAL_BACKEND = false;
const PRODUCTION_API_URL = 'https://sdpsbackend-production.up.railway.app/api';
// Android emulators reach the host at 10.0.2.2; iOS simulators use localhost.
// For a physical phone, replace this with your computer's LAN address.
const LOCAL_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://localhost:3000/api';
export const API_BASE_URL = __DEV__ && USE_LOCAL_BACKEND ? LOCAL_API_URL : PRODUCTION_API_URL;

// A 401 means the server no longer recognizes this token (expired, or
// revoked — sessions are persisted server-side now, but they can still
// genuinely run out). Screens that poll silently swallow request errors,
// so without this a dead token used to render as "no data" instead of
// prompting a re-login. AuthContext subscribes to fire an actual logout.
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

// The school an admin is currently working in (school picker in Menu).
// Sent as X-School-ID so a district admin — or anyone in more than one
// school — acts on the school they picked; the server checks they
// actually have access to it. Unset for single-school users.
let activeSchoolId: string | null = null;
export function setActiveSchoolId(schoolId: string | null): void {
  activeSchoolId = schoolId;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}`, ...(activeSchoolId ? { 'X-School-ID': activeSchoolId } : {}) } : {}),
        'X-Client': `mobile-${Platform.OS}/${APP_VERSION}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot reach the server. Check your connection and try again.',
    );
  }
  if (response.status === 401 && token) unauthorizedListener?.();
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new ApiError(body?.error || 'Request failed', response.status, body?.code, body?.triesLeft);
  return body as T;
}

/** A failed API call, with its HTTP status (e.g. 410 = a sign-in step expired; start over). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Machine-readable reason some endpoints add, e.g. 'PIN_NOT_SET', 'PIN_WRONG', 'PIN_LOCKED'. */
    public readonly code?: string,
    public readonly triesLeft?: number,
  ) {
    super(message);
  }
}

/**
 * What creating an account returns about its invite email. When the email
 * couldn't be sent (email not set up yet, or delivery failed), `setupLink`
 * is the one-time link to pass on another way.
 */
export interface InviteResult { emailSent?: boolean; setupLink?: string }

export const api = {
  forgotPassword: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  checkAccountLink: (token: string) =>
    request<{ purpose: 'INVITE' | 'RESET'; fullName: string; email: string }>('/auth/account-link', { method: 'POST', body: JSON.stringify({ token }) }),
  setPassword: (token: string, password: string) => request<{ email: string }>('/auth/set-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  /** Emails a staff member or parent a fresh invite (never set up) or password reset link. */
  sendAccountLink: (token: string, userId: string) => request<InviteResult>(`/admin/members/${userId}/send-link`, { method: 'POST' }, token),
  login: (identifier: string, password: string) => request<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  /** Step 1 of registering: emails a 6-digit code to confirm the address. `required: false` means skip the code step. */
  sendRegistrationCode: (email: string) =>
    request<{ required: boolean; message?: string }>('/auth/register-school/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  registerSchool: (input: { schoolName: string; campusName: string; campusAddress?: string; adminFullName: string; email: string; password: string; logoDataUrl?: string; emailCode?: string }) =>
    request<LoginResult>('/auth/register-school', { method: 'POST', body: JSON.stringify(input) }),
  // Two-step verification during sign-in (mfaToken comes from login/registerSchool).
  mfaVerify: (mfaToken: string, code: string) =>
    request<AuthSession & { recoveryCodesLeft?: number }>('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ mfaToken, code }) }),
  mfaSetup: (mfaToken: string) => request<MfaEnrollment>('/auth/mfa/setup', { method: 'POST', body: JSON.stringify({ mfaToken }) }),
  mfaSetupConfirm: (mfaToken: string, code: string) =>
    request<AuthSession & { recoveryCodes: string[] }>('/auth/mfa/setup/confirm', { method: 'POST', body: JSON.stringify({ mfaToken, code }) }),
  // Two-step verification for the signed-in account (Security page).
  myMfa: (token: string) => request<MfaStatus>('/me/mfa', {}, token),
  myMfaSetup: (token: string) => request<MfaEnrollment>('/me/mfa/setup', { method: 'POST' }, token),
  myMfaConfirm: (token: string, code: string) => request<{ recoveryCodes: string[] }>('/me/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) }, token),
  myMfaDisable: (token: string, password: string) => request<void>('/me/mfa/disable', { method: 'POST', body: JSON.stringify({ password }) }, token),
  myMfaNewRecoveryCodes: (token: string, code: string) =>
    request<{ recoveryCodes: string[] }>('/me/mfa/recovery-codes', { method: 'POST', body: JSON.stringify({ code }) }, token),
  districtOverview: (token: string) => request<DistrictSchool[]>('/district/overview', {}, token),
  // Data & Privacy (school admins).
  // Exports come back as JSON; the Data & Privacy screen hands them to the share sheet.
  exportStudent: (token: string, studentId: string) => request<unknown>(`/admin/students/${studentId}/export`, {}, token),
  exportSchool: (token: string) => request<unknown>('/admin/export', {}, token),
  removedStudents: (token: string) => request<RemovedStudent[]>('/admin/students/removed', {}, token),
  restoreStudent: (token: string, studentId: string) => request<void>(`/admin/students/${studentId}/restore`, { method: 'POST' }, token),
  permanentlyDeleteStudent: (token: string, studentId: string, confirmName: string, reason?: string) =>
    request<{ deleted: Record<string, number> }>(`/admin/students/${studentId}/permanent`, { method: 'DELETE', body: JSON.stringify({ confirmName, reason }) }, token),
  retention: (token: string) => request<RetentionSettings>('/admin/retention', {}, token),
  saveRetention: (token: string, settings: { removedStudentRetentionDays: number | null; queueHistoryRetentionDays: number | null }) =>
    request<void>('/admin/retention', { method: 'PATCH', body: JSON.stringify(settings) }, token),
  runRetention: (token: string) => request<{ studentsDeleted: number; pickupHistoryDeleted: number }>('/admin/retention/run', { method: 'POST' }, token),
  resetStaffMfa: (token: string, userId: string) => request<void>(`/admin/staff/${userId}/reset-mfa`, { method: 'POST' }, token),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<void>('/me/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }, token),
  myStudents: (token: string) => request<Child[]>('/me/students', {}, token),
  myAttendance: (token: string) => request<MyAttendanceChild[]>('/me/attendance', {}, token),
  myClasses: (token: string) => request<MyClassChild[]>('/me/classes', {}, token),
  requestDropOff: (token: string, studentId: string, location: { latitude: number; longitude: number }) => request<{ id: string }>(`/me/students/${studentId}/drop-off`, { method: 'POST', body: JSON.stringify(location) }, token),
  /** A pickup needs the parent's own 6-digit pickup PIN. */
  requestPickUp: (token: string, studentId: string, location: { latitude: number; longitude: number }, pin: string) =>
    request<{ id: string }>(`/me/students/${studentId}/pick-up`, { method: 'POST', body: JSON.stringify({ ...location, pin }) }, token),
  // Pickup PIN (parents)
  myPin: (token: string) => request<{ hasPin: boolean }>('/me/pin', {}, token),
  createPin: (token: string, pin: string) => request<void>('/me/pin', { method: 'POST', body: JSON.stringify({ pin }) }, token),
  changePin: (token: string, currentPin: string, newPin: string) => request<void>('/me/pin/change', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) }, token),
  forgotPin: (token: string) => request<{ message: string }>('/me/pin/forgot', { method: 'POST' }, token),
  teacherQueue: (token: string) => request<QueueItem[]>('/teacher/queue', {}, token),
  adminQueue: (token: string) => request<QueueItem[]>('/admin/queue', {}, token),
  approveQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/approve`, { method: 'POST' }, token),
  declineQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/decline`, { method: 'POST' }, token),
  adminOverview: (token: string) => request<AdminOverview>('/admin/overview', {}, token),
  adminSetup: (token: string) => request<AdminSetup>('/admin/setup', {}, token),
  // A school administrator's Subscription page
  mySubscription: (token: string) => request<SchoolSubscriptionView>('/admin/subscription', {}, token),
  /** Pay by card (answers a Stripe page to open), or, when already paying by card, change plan there and then. */
  /** Puts the school's running free trial on the chosen plan. */
  chooseTrialPlan: (token: string, planId: string, interval: BillingInterval) =>
    request<void>('/admin/subscription/trial', { method: 'POST', body: JSON.stringify({ planId, interval }) }, token),
  subscriptionCheckout: (token: string, input: { planId: string; interval: BillingInterval; confirm: true; startNow?: boolean }) =>
    request<{ url?: string; changed?: boolean }>('/admin/subscription/checkout', { method: 'POST', body: JSON.stringify(input) }, token),
  requestSubscriptionChange: (token: string, input: { type: 'CHANGE_PLAN' | 'CANCEL'; planId?: string; interval?: BillingInterval; note?: string; confirm: true }) =>
    request<{ id: string }>('/admin/subscription/requests', { method: 'POST', body: JSON.stringify(input) }, token),
  withdrawSubscriptionRequest: (token: string, requestId: string) => request<void>(`/admin/subscription/requests/${requestId}`, { method: 'DELETE' }, token),
  cancelPaidSubscription: (token: string, input: { confirm: true } | { resume: true }) =>
    request<void>('/admin/subscription/cancel', { method: 'POST', body: JSON.stringify(input) }, token),
  billingPortal: (token: string) => request<{ url: string }>('/admin/subscription/portal', { method: 'POST' }, token),
  /** The signed-in person's school: its name and logo (for the dashboard). */
  mySchool: (token: string) => request<SchoolBranding>('/me/school', {}, token),
  /** logoDataUrl: an image replaces the logo, '' removes it, omitted keeps it. */
  updateSchoolProfile: (token: string, input: { name?: string; address?: string; startTime?: string; dismissalTime?: string; extendedTime?: string; logoDataUrl?: string }) =>
    request<void>('/admin/school', { method: 'PATCH', body: JSON.stringify(input) }, token),
  addCampus: (token: string, input: { name: string; address: string; geofenceRadius?: number; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<{ id: string; latitude: number; longitude: number }>('/admin/campuses', { method: 'POST', body: JSON.stringify(input) }, token),
  /** Suspends (drop-off/pick-up paused there) or reactivates a location. */
  setCampusActive: (token: string, campusId: string, active: boolean) =>
    request<void>(`/admin/campuses/${campusId}/status`, { method: 'POST', body: JSON.stringify({ active }) }, token),
  /** Removes an added (non-primary) location; its students and classes move to the primary location. */
  removeCampus: (token: string, campusId: string) =>
    request<{ moved: { students: number; classes: number } }>(`/admin/campuses/${campusId}`, { method: 'DELETE' }, token),
  updateCampus: (token: string, campusId: string, input: { name?: string; address?: string; geofenceRadius?: number; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<void>(`/admin/campuses/${campusId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  students: (token: string) => request<Student[]>('/admin/students', {}, token),
  addStudent: (token: string, input: unknown) => request<{ id: string } & InviteResult>('/admin/students', { method: 'POST', body: JSON.stringify(input) }, token),
  setStudentStatus: (token: string, studentId: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<void>(`/admin/students/${studentId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  deleteStudent: (token: string, studentId: string) => request<void>(`/admin/students/${studentId}`, { method: 'DELETE' }, token),
  promotionPreview: (token: string, from: string, to: string) => request<PromotionPreview[]>(`/admin/promotions/preview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {}, token),
  promote: (token: string, fromSchoolYearId: string, toSchoolYearId: string) => request<{ promoted: number }>('/admin/promotions', { method: 'POST', body: JSON.stringify({ fromSchoolYearId, toSchoolYearId }) }, token),
  promoteByGrade: (token: string, input: { fromSchoolYearId: string; toSchoolYearId: string; fromGradeLevelId: string; toGradeLevelId: string; teacherUserId?: string }) =>
    request<{ promoted: number; skipped: number }>('/admin/promotions/by-grade', { method: 'POST', body: JSON.stringify(input) }, token),
  promoteByClass: (token: string, input: { fromClassId: string; toClassId: string; teacherUserId?: string }) =>
    request<{ promoted: number; skipped: number; sameYear: boolean }>('/admin/promotions/by-class', { method: 'POST', body: JSON.stringify(input) }, token),
  /** The open request to delete this school (Profile → Delete school account), if any. */
  schoolDeletionRequest: (token: string) => request<{ request: SchoolDeletionRequest | null }>('/admin/school/deletion-request', {}, token),
  requestSchoolDeletion: (token: string, input: { confirmName: string; password: string; reason?: string }) =>
    request<{ request: SchoolDeletionRequest }>('/admin/school/deletion-request', { method: 'POST', body: JSON.stringify(input) }, token),
  withdrawSchoolDeletion: (token: string) => request<void>('/admin/school/deletion-request/withdraw', { method: 'POST' }, token),
  /** Creates next school year (in planning), or returns the one already planned. */
  createNextSchoolYear: (token: string) => request<{ id: string; name: string; created: boolean }>('/admin/school-years/next', { method: 'POST' }, token),
  activateSchoolYear: (token: string, schoolYearId: string) =>
    request<void>(`/admin/school-years/${schoolYearId}/activate`, { method: 'POST' }, token),
  guardians: (token: string) => request<Guardian[]>('/admin/guardians', {}, token),
  addGuardian: (token: string, input: { fullName: string; email: string; phone?: string }) =>
    request<{ id: string } & InviteResult>('/admin/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
  setGuardianActive: (token: string, guardianId: string, active: boolean) =>
    request<void>(`/admin/guardians/${guardianId}`, { method: 'PATCH', body: JSON.stringify({ active }) }, token),
  deleteGuardian: (token: string, guardianId: string) => request<void>(`/admin/guardians/${guardianId}`, { method: 'DELETE' }, token),
  teacherAttendance: (token: string, date?: string) => request<AttendanceRow[]>(`/teacher/attendance${date ? `?date=${date}` : ''}`, {}, token),
  teacherClass: (token: string) => request<TeacherClass | null>('/teacher/class', {}, token),
  teacherStudents: (token: string) => request<RosterStudent[]>('/teacher/students', {}, token),
  teacherAttendanceHistory: (token: string) => request<TeacherAttendanceStudent[]>('/teacher/attendance-history', {}, token),
  adminAttendance: (token: string, classId: string, date?: string) =>
    request<AttendanceRow[]>(`/admin/attendance?classId=${encodeURIComponent(classId)}${date ? `&date=${date}` : ''}`, {}, token),
  adminAttendanceSummary: (token: string, date?: string) =>
    request<AttendanceSummary>(`/admin/attendance/summary${date ? `?date=${date}` : ''}`, {}, token),
  markAttendance: (token: string, studentId: string, date: string, status: SettableAttendanceStatus) =>
    request<void>('/attendance', { method: 'POST', body: JSON.stringify({ studentId, date, status }) }, token),
  classes: (token: string) => request<ClassRow[]>('/admin/classes', {}, token),
  addClass: (token: string, input: { name: string; gradeLevelId: string; roomName?: string; schoolYearId: string; campusId?: string }) =>
    request<{ id: string }>('/admin/classes', { method: 'POST', body: JSON.stringify(input) }, token),
  teachers: (token: string) => request<TeacherRow[]>('/admin/teachers', {}, token),
  addTeacher: (token: string, input: { fullName: string; email: string; photoDataUrl?: string; classId?: string }) =>
    request<{ id: string } & InviteResult>('/admin/teachers', { method: 'POST', body: JSON.stringify(input) }, token),
  updateTeacher: (token: string, teacherId: string, input: { fullName?: string; photoDataUrl?: string; classId?: string | null }) =>
    request<void>(`/admin/teachers/${teacherId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  staff: (token: string) => request<StaffRow[]>('/admin/staff', {}, token),
  addStaff: (token: string, input: { fullName: string; email: string; photoDataUrl?: string; classId?: string; role: StaffRole }) =>
    request<{ id: string; restored: boolean } & InviteResult>('/admin/staff', { method: 'POST', body: JSON.stringify(input) }, token),
  setStaffStatus: (token: string, staffId: string, active: boolean) =>
    request<void>(`/admin/staff/${staffId}`, { method: 'PATCH', body: JSON.stringify({ active }) }, token),
  deleteStaff: (token: string, staffId: string) => request<void>(`/admin/staff/${staffId}`, { method: 'DELETE' }, token),
  teacherParents: (token: string) => request<{ id: string; fullName: string }[]>('/teacher/parents', {}, token),
  sendNotice: (token: string, input: { title: string; body: string; targetType: 'SCHOOL' | 'CLASS' | 'PARENT' | 'STAFF' | 'ADMIN' | 'TEACHER'; targetParentUserId?: string; targetStaffUserId?: string }) =>
    request<void>('/notices', { method: 'POST', body: JSON.stringify(input) }, token),
  myNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/me/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
  /** Sent box — what the signed-in user sent themselves, any role. */
  sentNotices: (token: string) => request<SentNotice[]>('/notices/sent', {}, token),
  markNoticeRead: (token: string, noticeId: string) => request<void>(`/notices/${noticeId}/read`, { method: 'POST' }, token),
  inviteGuardian: (token: string, input: { fullName: string; email: string; phone?: string; relationship: string }) =>
    request<{ id: string; status: 'PENDING' } & InviteResult>('/me/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
  myGuardians: (token: string) => request<MyGuardians>('/me/guardians', {}, token),
  guardianRequests: (token: string) => request<GuardianRequest[]>('/admin/guardian-requests', {}, token),
  approveGuardianRequest: (token: string, batchId: string, canManage: boolean) =>
    request<void>(`/admin/guardian-requests/${batchId}/approve`, { method: 'POST', body: JSON.stringify({ canManage }) }, token),
  rejectGuardianRequest: (token: string, batchId: string, note?: string) =>
    request<void>(`/admin/guardian-requests/${batchId}/reject`, { method: 'POST', body: JSON.stringify({ note }) }, token),
  auditLog: (token: string, filters: { action?: string; before?: AuditEntry } = {}) => {
    const params = new URLSearchParams({ limit: '50' });
    if (filters.action) params.set('action', filters.action);
    if (filters.before) { params.set('beforeCreatedAt', filters.before.createdAt); params.set('beforeId', filters.before.id); }
    return request<AuditLogPage>(`/admin/audit-log?${params}`, {}, token);
  },
  adminNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/admin/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
  /** Staff inbox — shared by the admin dashboard's Notices tab and the teacher app's Notices tab. */
  staffNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/staff/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
};

export interface AdminOverview { totalStudents: number; activeTeachers: number; presentToday: number; pendingRequests: number }
/** Structured address parts as stored (null when only the legacy one-line `address` exists). */
export interface StoredAddressParts {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}
export type BillingInterval = 'MONTH' | 'YEAR';
/** How full a school's plan is: NEAR = 80%+, CLOSE = 90%+, FULL = 100%. */
export type CapacityLevel = 'OK' | 'NEAR' | 'CLOSE' | 'FULL';
/** A plan sets a student limit (null = none) and prices; every plan has every feature. */
export interface SchoolPlanOption {
  id: string; name: string; description: string | null; currency: string; studentLimit: number | null; monthlyPriceCents: number | null;
  annualPriceCents: number | null; customPricing: boolean; current: boolean; recommended: boolean; tooSmall: boolean;
}
export interface SubscriptionRequest {
  id: string; type: 'CHANGE_PLAN' | 'CANCEL'; planId: string | null; planName: string | null; interval: BillingInterval | null; note: string | null;
  status: 'OPEN' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN'; requestedBy: string | null; resolvedBy: string | null; resolutionNote: string | null; createdAt: string; resolvedAt: string | null;
}
export interface SchoolInvoice {
  id: string; number: string; description: string; amountCents: number; currency: string; status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';
  dueOn: string | null; paidAt: string | null; paidCents: number; overdue: boolean; hostedUrl: string | null;
}
export interface SchoolDeletionRequest {
  id: string; status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING'; createdAt: string; dueAt: string; requesterName: string;
  /** Still being reviewed, so the school can withdraw it. */
  canWithdraw: boolean;
}
export interface SchoolSubscriptionView {
  subscription: {
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; planId: string; planName: string; studentLimit: number | null; customPricing: boolean;
    interval: BillingInterval; priceCents: number | null; currency: string; startedOn: string; currentPeriodEnd: string | null;
    trialEndsOn: string | null; trialDaysLeft: number | null; trialEnded: boolean; cancelAtPeriodEnd: boolean;
  } | null;
  activeStudents: number; studentLimit: number | null; remaining: number | null; percentUsed: number | null; level: CapacityLevel;
  /** Why students can't be added right now, if the subscription has lapsed. */
  lapsed: 'CANCELED' | 'TRIAL_ENDED' | 'PAYMENT_OVERDUE' | null;
  /** onlinePayment: card payment is offered. paidOnline: this school already pays by card. */
  onlinePayment: boolean; paidOnline: boolean;
  plans: SchoolPlanOption[]; graceDays: number; openRequest: SubscriptionRequest | null; requests: SubscriptionRequest[]; invoices: SchoolInvoice[];
}
export interface SchoolBranding {
  id: string;
  name: string;
  logoUrl: string | null;
}
export interface SchoolProfile extends StoredAddressParts {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  address?: string;
  timezone: string;
  status: string;
  startTime: string | null;
  dismissalTime: string | null;
  extendedTime: string | null;
}
export interface CampusProfile extends StoredAddressParts {
  /** The school's first location — always shown, can't be removed. */
  isPrimary?: boolean;
  createdAt?: string; // UTC 'YYYY-MM-DD HH:MM:SS'
  /** SUSPENDED = drop-off/pick-up paused at this location. */
  status?: 'ACTIVE' | 'SUSPENDED';
  id: string;
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
  startTime: string | null;
  dismissalTime: string | null;
  extendedTime: string | null;
}
export interface AdminSetup {
  school: SchoolProfile;
  schoolYears: { id: string; name: string; status: string }[];
  gradeLevels: { id: string; name: string; sortOrder: number }[];
  classes: { id: string; name: string; schoolYearId: string; gradeLevelId: string }[];
  campuses: CampusProfile[];
  guardians: { id: string; fullName: string; email: string; phone?: string }[];
}
export interface Student extends Child {
  firstName: string;
  lastName: string;
  gradeLevelId: string;
  gradeName: string;
  className?: string;
  photoUrl?: string;
  guardians: { id: string; fullName: string; email: string }[];
  /** ACTIVE/SUSPENDED — separate from `status`, which mirrors pickup status here like everywhere else `Child` is used. */
  enrollmentStatus: 'ACTIVE' | 'SUSPENDED';
}
export type SettableAttendanceStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY' | 'WEEKEND';
export interface AttendanceRow {
  studentId: string;
  fullName: string;
  photoUrl?: string;
  classId: string;
  className: string;
  status: SettableAttendanceStatus | 'UNMARKED';
  /** Arrived after the school's start time — only meaningful when status is PRESENT. */
  late: boolean;
}
export interface AttendanceSummary { present: number; absent: number; sick: number; late: number; unmarked: number; total: number }
export interface TeacherClass { id: string; name: string; roomName: string | null; gradeName: string }
export interface RosterStudent { id: string; fullName: string; photoUrl?: string; status: 'ACTIVE' | 'SUSPENDED' }
export interface TeacherAttendanceStudent {
  id: string;
  fullName: string;
  photoUrl?: string;
  records: { date: string; status: 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY'; late: boolean }[];
}
export interface MyAttendanceChild {
  id: string;
  fullName: string;
  photoUrl?: string;
  className?: string;
  teacherName?: string;
  records: { date: string; status: 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY'; late: boolean }[];
}
export interface MyClassChild {
  id: string;
  fullName: string;
  photoUrl: string | null;
  gradeName: string | null;
  className: string | null;
  roomName: string | null;
  teacherName: string | null;
}
export interface PromotionPreview { studentId: string; fullName: string; fromGrade: string; proposedGrade: { id: string; name: string } | null; alreadyEnrolled: boolean }
export interface Guardian {
  id: string;
  /** The underlying user id — what notices target (target_parent_user_id), distinct from the guardian record's own id. */
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  active: boolean;
  /** Invited but hasn't chosen a password yet. */
  needsSetup?: boolean;
  children: { id: string; fullName: string }[];
}
export interface ClassRow {
  id: string;
  name: string;
  roomName?: string;
  schoolYearId: string;
  schoolYearName: string;
  gradeLevelId: string;
  gradeName: string;
  campusId?: string;
  teacherId?: string;
  teacherName?: string;
  studentCount: number;
}
export interface TeacherRow {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  active: boolean;
  classId?: string;
  className?: string;
}
/** Role sent to POST /admin/staff — 'admin' and 'front_desk' both land on the admin dashboard; only 'teacher' can take a classId. */
export type StaffRole = 'teacher' | 'admin' | 'front_desk';
export type GuardianRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/** One parent submission ("please authorize this adult"), covering one or more children. */
export interface GuardianRequest {
  batchId: string;
  status: GuardianRequestStatus;
  fullName: string;
  email: string;
  phone: string | null;
  relationship: string;
  requestedByName: string;
  requestedAt: string; // UTC 'YYYY-MM-DD HH:MM:SS'
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  students: string[];
}
export interface MyGuardians {
  authorized: { guardianId: string; fullName: string; relationship: string; canPickUp: number; students: string[] }[];
  requests: { batchId: string; fullName: string; relationship: string; status: GuardianRequestStatus; requestedAt: string; decidedAt: string | null; decisionNote: string | null; students: string[] }[];
}
export interface AuditEntry {
  id: string;
  createdAt: string; // 'YYYY-MM-DD HH:MM:SS', UTC
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}
export interface AuditLogPage { entries: AuditEntry[]; hasMore: boolean; actions: string[] }
export interface DistrictSchool {
  schoolId: string; schoolName: string; schoolCode: string; districtName: string;
  students: number; teachers: number; presentToday: number; pendingRequests: number; pendingGuardianApprovals: number;
}
export interface RemovedStudent { id: string; fullName: string; studentNumber: string | null; removedAt: string; purgeAfter: string | null }
export interface RetentionSettings {
  removedStudentRetentionDays: number | null;
  queueHistoryRetentionDays: number | null;
  minimumDays: number;
  wouldDeleteNow: { removedStudents: number; pickupHistory: number };
}
export interface MfaEnrollment { secret: string; otpauthUri: string }
export interface MfaStatus { enabled: boolean; enabledAt: string | null; required: boolean; recoveryCodesLeft: number }
export interface StaffRow {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  active: boolean;
  mfaEnabled?: boolean;
  /** Invited but hasn't chosen a password yet. */
  needsSetup?: boolean;
  /** Raw membership role as stored — 'school_admin' is the Admin role, 'staff' is Front Desk / Office Staff. */
  role: 'teacher' | 'school_admin' | 'staff';
  classId?: string;
  className?: string;
}
