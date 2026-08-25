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
}

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
  parentId: string;
  teacherId: string;
  status: ChildStatus;
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
  parentName: string;
  requestType: QueueRequestType;
  requestedAt: string; // ISO timestamp
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  senderName: string;
  senderRole: Extract<Role, 'admin' | 'teacher'>;
  createdAt: string; // ISO timestamp
  /** undefined/'ALL' = school-wide; otherwise a specific teacher's class or parent. */
  targetTeacherId?: string;
  targetParentId?: string;
  read?: boolean;
}

export interface AdminOverviewMetrics {
  totalEnrolledStudents: number;
  activeTeachers: number;
  presentToday: number;
  pendingRequests: number;
}
