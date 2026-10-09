/**
 * Shared domain types for the School Drop-off & Pick-up app.
 * Maps to JIRA project SDP — see EPIC 1-4 issue descriptions.
 */

export type Role = 'parent' | 'teacher' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /**
   * Per-school roles from the login response — 'school_admin', 'staff'
   * (front desk), 'teacher', 'parent', 'platform_super_admin', or
   * 'district_admin' (one entry per school in their district).
   */
  memberships?: { schoolId: string; role: string; schoolName?: string; districtName?: string | null }[];
  /** Set for platform administrators, who use the website (see PlatformOnWebScreen). */
  platform?: { role: string; permissions: string[] } | null;
}

/**
 * What sign-in returns when the password was right but a second step is
 * owed: enter an authenticator code (mfaRequired), or — for an account
 * that must use two-step verification and hasn't set it up — enroll
 * first (mfaSetupRequired). mfaToken identifies this half-finished sign-in.
 */
export interface MfaChallenge {
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  mfaToken: string;
}
export type LoginResult = AuthSession | MfaChallenge;
export const isMfaChallenge = (result: LoginResult): result is MfaChallenge => 'mfaToken' in result;

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  user: User;
}

/** Per-child status shown on the Parent Drop-off/Pick-up screen (SDP-3). */
export type ChildStatus =
  | 'AT_HOME'
  | 'DROPOFF_REQUESTED'
  | 'PRESENT'
  | 'PICKUP_REQUESTED'
  | 'PICKED_UP';

export interface Child {
  id: string;
  fullName: string;
  photoUrl?: string;
  parentId?: string;
  teacherId: string;
  gradeName?: string;
  className?: string;
  status: ChildStatus;
  daycare?: boolean;
  /** The child's campus location — drives the drop-off/pick-up geofence (SDP-3 follow-up). Null/undefined lat/long means no geofence is configured for that campus yet. */
  campusId?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
}

export interface Parent {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  childIds: string[];
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  roomName: string;
  studentIds: string[];
}

/** Mon-Fri attendance status per day, keyed by ISO date (SDP-4 / SDP-7). */
export type DailyAttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';

export interface AttendanceRecord {
  childId: string;
  date: string; // ISO yyyy-mm-dd
  status: DailyAttendanceStatus;
}

/** A single item on the teacher's live queue (SDP-6). */
export type QueueRequestType = 'DROP_OFF' | 'PICK_UP';

export interface QueueItem {
  id: string;
  childId: string;
  childName: string;
  childPhotoUrl?: string;
  className?: string;
  parentName: string;
  teacherId: string;
  requestType: QueueRequestType;
  requestedAt: string; // ISO timestamp
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  senderName: string;
  senderRole: Role;
  createdAt: string; // ISO timestamp
  read: boolean;
}
