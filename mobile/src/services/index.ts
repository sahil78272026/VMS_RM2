import api from './api';

export const AuthService = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (d: any) => api.post('/auth/change-password', d),
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
};

export const GuardService = {
  getAll: () => api.get('/guards'),
  getMe: () => api.get('/guards/me'),
  getById: (id: string) => api.get(`/guards/${id}`),
  create: (d: any) => api.post('/guards', d),
  update: (id: string, d: any) => api.patch(`/guards/${id}`, d),
  deactivate: (id: string) => api.delete(`/guards/${id}`),
};

export const GateService = {
  getAll: () => api.get('/gates'),
  getById: (id: string) => api.get(`/gates/${id}`),
  create: (d: any) => api.post('/gates', d),
  update: (id: string, d: any) => api.patch(`/gates/${id}`, d),
};

export const GateSessionService = {
  startShift: (gate_id: string) => api.post('/gate-sessions/start', { gate_id }),
  endShift: () => api.post('/gate-sessions/end'),
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
  getById: (id: string) => api.get(`/maintenance/${id}`),
  generate: (d: any) => api.post('/maintenance', d),
  pay: (id: string, d: any) => api.patch(`/maintenance/${id}/pay`, d),
  getAll: (p?: any) => api.get('/maintenance', { params: p }),
  getOverdue: () => api.get('/maintenance/overdue'),
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
};
