import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthService = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (d: any) => api.post('/auth/verify-otp', d),
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  googleLogin: (d: any) => api.post('/auth/google', d),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (d: any) => api.post('/auth/change-password', d),
  getMySocieties: () => api.get('/auth/my-societies'),
  switchSociety: (society_id: number) => api.post('/auth/switch-society', { society_id }),
};

export const SocietyService = {
  getAll: (p?: any) => api.get('/societies', { params: p }),
  getCatalog: (p?: any) => api.get('/societies/catalog', { params: p }),
  getById: (id: number | string) => api.get(`/societies/${id}`),
  create: (d: any) => api.post('/societies', d),
  update: (id: number | string, d: any) => api.put(`/societies/${id}`, d),
  getStats: (id: number | string) => api.get(`/societies/${id}/stats`),
  batchCreateFlats: (id: number | string, d: any) => api.post(`/societies/${id}/batch-flats`, d),
  getAdmins: (id: number | string) => api.get(`/societies/${id}/admins`),
  assignAdmin: (id: number | string, d: any) => api.post(`/societies/${id}/admins`, d),
  removeAdmin: (society_id: number | string, user_id: number | string) => api.delete(`/societies/${society_id}/admins/${user_id}`),
  suspend: (id: number | string) => api.post(`/societies/${id}/suspend`),
  activate: (id: number | string) => api.post(`/societies/${id}/activate`),
  delete: (id: number | string) => api.delete(`/societies/${id}`),
  getDonations: (society_id: number | string) => api.get(`/societies/${society_id}/donations`),
  verifyDonation: (society_id: number | string, donation_id: number | string) => api.patch(`/societies/${society_id}/donations/${donation_id}/verify`),
};

export const FlatService = {
  getAll: (p?: any) => api.get('/flats', { params: p }),
  getById: (id: string) => api.get(`/flats/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/flats/${id}/status`, { status }),
};

export const FlatUserService = {
  getMyFlat: () => api.get('/flat-users/my-flat'),
  addPrimary: (d: any) => api.post('/flat-users', d),
  addMember: (d: any) => api.post('/flat-users/member', d),
  update: (id: string, d: any) => api.patch(`/flat-users/${id}`, d),
  remove: (id: string) => api.delete(`/flat-users/${id}`),
  promote: (id: string) => api.patch(`/flat-users/${id}/promote`),
  demote: (id: string) => api.patch(`/flat-users/${id}/demote`),
  getPendingFamily: () => api.get('/flat-users/pending/family'),
  approveFamily: (userId: string, relation: string) => api.post(`/flat-users/${userId}/approve-family`, { relation }),
  moveOut: () => api.post('/flat-users/move-out'),
};

export const GuardService = {
  getAll: (p?: any) => api.get('/guards', { params: p }),
  getMe: () => api.get('/guards/me'),
  getById: (id: string) => api.get(`/guards/${id}`),
  create: (d: any) => api.post('/guards', d),
  update: (id: string, d: any) => api.patch(`/guards/${id}`, d),
  deactivate: (id: string) => api.delete(`/guards/${id}`),
};

export const GateService = {
  getAll: (p?: any) => api.get('/gates', { params: p }),
  getById: (id: string) => api.get(`/gates/${id}`),
  create: (d: any) => api.post('/gates', d),
  update: (id: string, d: any) => api.patch(`/gates/${id}`, d),
};

export const GateSessionService = {
  startShift: (gate_id: string, guard_name?: string, target_guard_id?: string, pin?: string) => api.post('/gate-sessions/start', { gate_id, guard_name, target_guard_id, pin }),
  endShift: (target_guard_id?: string) => api.post('/gate-sessions/end', { target_guard_id }),
  getAll: (p?: any) => api.get('/gate-sessions', { params: p }),
  getActive: () => api.get('/gate-sessions/active'),
  getMy: () => api.get('/gate-sessions/my'),
  getById: (id: string) => api.get(`/gate-sessions/${id}`),
};

export const VisitorService = {
  search: (q: string) => api.get('/visitors', { params: { q } }),
  getById: (id: string) => api.get(`/visitors/${id}`),
  create: (d: any) => api.post('/visitors', d),
  update: (id: string, d: any) => api.patch(`/visitors/${id}`, d),
  blacklist: (id: string, reason: string) => api.post(`/visitors/${id}/blacklist`, { reason }),
  removeBlacklist: (id: string) => api.delete(`/visitors/${id}/blacklist`),
};

export const VisitorLogService = {
  selfCheckin: (d: any) => api.post('/visitor-logs/self-checkin', d),
  getLogs: (p?: any) => api.get('/visitor-logs', { params: p }),
  getPending: () => api.get('/visitor-logs/pending'),
  getInside: () => api.get('/visitor-logs/inside'),
  create: (d: any) => api.post('/visitor-logs', d),
  confirmEntry: (id: string, d: any) => api.patch(`/visitor-logs/${id}/entry`, d),
  forceApprove: (id: string, reason: string) => api.patch(`/visitor-logs/${id}/force-approve`, { reason }),
  confirmExit: (id: string) => api.patch(`/visitor-logs/${id}/exit`),
  getMyLogs: (p?: any) => api.get('/visitor-logs/my', { params: p }),
  getMyPending: () => api.get('/visitor-logs/my/pending'),
  approve: (id: string) => api.patch(`/visitor-logs/${id}/approve`),
  deny: (id: string) => api.patch(`/visitor-logs/${id}/deny`),
  confirmDeparture: (id: string) => api.patch(`/visitor-logs/${id}/confirm-departure`),
  getOverdue: () => api.get('/visitor-logs/overdue'),
};

export const PreApprovalService = {
  getMy: () => api.get('/pre-approvals/my'),
  create: (d: any) => api.post('/pre-approvals', d),
  update: (id: string, d: any) => api.patch(`/pre-approvals/${id}`, d),
  cancel: (id: string) => api.delete(`/pre-approvals/${id}`),
  check: (phone: string, flat_id: string) => api.get('/pre-approvals/check', { params: { phone, flat_id } }),
  verifyPasscode: (passcode: string) => api.get(`/pre-approvals/verify/${passcode}`),
};

export const FrequentPassService = {
  getMy: () => api.get('/frequent-passes/my'),
  create: (d: any) => api.post('/frequent-passes', d),
  update: (id: string, d: any) => api.patch(`/frequent-passes/${id}`, d),
  suspend: (id: string) => api.patch(`/frequent-passes/${id}/suspend`),
  activate: (id: string) => api.patch(`/frequent-passes/${id}/activate`),
  delete: (id: string) => api.delete(`/frequent-passes/${id}`),
  check: (phone: string, flat_id: string) => api.get('/frequent-passes/check', { params: { phone, flat_id } }),
};

export const MaintenanceService = {
  getMy: () => api.get('/maintenance/my'),
  submitPayment: (d: any) => api.post('/maintenance/submit', d),
  getPending: (p?: any) => api.get('/maintenance/admin/pending', { params: p }),
  getFlats: (p?: any) => api.get('/maintenance/admin/flats', { params: p }),
  approve: (id: string) => api.post(`/maintenance/admin/approve/${id}`),
  reject: (id: string) => api.post(`/maintenance/admin/reject/${id}`),
  offline: (d: any) => api.post('/maintenance/admin/offline', d),
};

export const AnnouncementService = {
  getAll: (p?: any) => api.get('/announcements', { params: p }),
  getById: (id: string) => api.get(`/announcements/${id}`),
  create: (d: any) => api.post('/announcements', d),
  update: (id: string, d: any) => api.patch(`/announcements/${id}`, d),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};

export const UserService = {
  getAll: (p?: any) => api.get('/users', { params: p }),
  toggleNotifications: (muted: boolean) => api.patch('/users/me/notifications', { muted }),
  toggleForceEntry: (allow: boolean) => api.patch('/users/me/force-entry', { allow_guard_force_entry: allow }),
};

export const AmenityService = {
  getAll: (p?: any) => api.get('/amenities', { params: p }),
  create: (d: any, society_id: string | number) => api.post(`/amenities?society_id=${society_id}`, d),
  update: (id: string, d: any) => api.patch(`/amenities/${id}`, d),
  delete: (id: string) => api.delete(`/amenities/${id}`),
};

export const HelpdeskService = {
  getMy: (p?: any) => api.get('/helpdesk/my', { params: p }),
  getAll: (p?: any) => api.get('/helpdesk', { params: p }),
  create: (d: any) => api.post('/helpdesk', d),
  update: (id: string | number, d: any) => api.patch(`/helpdesk/${id}`, d),
};

export const OCRService = {
  scanUtr: async (d: any) => {
    const token = await AsyncStorage.getItem('access_token');
    const activeSocietyId = await AsyncStorage.getItem('active_society_id');
    const res = await fetch(`${api.defaults.baseURL}/ocr/scan-utr`, {
      method: 'POST',
      body: d,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(activeSocietyId ? { 'X-Society-ID': activeSocietyId } : {})
      }
    });
    const json = await res.json();
    if (!res.ok) throw { response: { data: json } };
    return { data: json };
  },
};
