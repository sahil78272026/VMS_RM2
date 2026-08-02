import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView, Image, BackHandler, Linking, PanResponder, Dimensions, Animated, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisitorLogService, PreApprovalService, FrequentPassService, MaintenanceService, AnnouncementService, FlatUserService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, PageLayout, StatCard, EmptyState, LoadingScreen, Modal, Tabs, Calendar, SocietySwitcher, QuickActionTile } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';

const { width } = Dimensions.get('window');

// ── Warm Aesthetic Theme Palette ─────────────────────────────────────────────
const Warm = {
  bg: '#F4F0EA',             // Warm sand/stone background (soft, organic, inviting)
  headerBg: '#EBE5DC',       // Warm sand stone header
  headerBorder: '#DDD6CC',   // Subtle stone border
  cardBg: '#FFFFFF',         // Crisp elevated white surface
  cardBorder: '#E5DFD7',     // Soft divider
  cardSubtle: '#F8F6F2',     // Subdued background for inner boxes
  text: '#1E293B',           // Deep slate (crisp readable text)
  textMuted: '#64748B',      // Slate gray
  textDim: '#94A3B8',        // Soft gray
  accent: '#0284C7',         // Vibrant sky blue
  accentDim: '#E0F2FE',      // Soft sky tint
  green: '#10B981',          // Emerald green
  greenDim: '#DCFCE7',       // Soft green tint
  amber: '#F59E0B',          // Warm amber
  amberDim: '#FEF3C7',       // Soft amber tint
  red: '#EF4444',            // Soft red
  redDim: '#FEE2E2',         // Soft red tint
  shadow: {
    shadowColor: '#4A3E3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

export function ResidentDashboard({ route }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout, activeSociety, activeSocietyId } = useAuth();
  const [currentTab, setCurrentTab] = useState(route?.params?.tab || 'dashboard');

  const tabOrder = ['dashboard', 'history', 'passes', 'bills', 'profile'];
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 20,
    onPanResponderRelease: (_, gs) => {
      if (Math.abs(gs.dx) > 35 && Math.abs(gs.vx) > 0.15) {
        const idx = tabOrder.indexOf(currentTabRef.current);
        if (gs.dx < 0 && idx < tabOrder.length - 1) setCurrentTab(tabOrder[idx + 1]);
        if (gs.dx > 0 && idx > 0) setCurrentTab(tabOrder[idx - 1]);
      }
    },
  }), []);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevTabRef = useRef(currentTab);

  useEffect(() => {
    const prevIdx = tabOrder.indexOf(prevTabRef.current);
    const newIdx = tabOrder.indexOf(currentTab);
    if (prevIdx !== newIdx) {
      const startVal = newIdx > prevIdx ? width * 0.2 : -width * 0.2;
      slideAnim.setValue(startVal);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
    prevTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    const backAction = () => {
      if (currentTab !== 'dashboard') {
        setCurrentTab('dashboard');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentTab]);

  const [pending, setPending] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [flatStatus, setFlatStatus] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [preApprovals, setPreApprovals] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pr, lr, br, ar, par, fpr] = await Promise.all([
        VisitorLogService.getMyPending().catch(() => ({ data: { data: [] } })),
        VisitorLogService.getMyLogs({ per_page: 20 }).catch(() => ({ data: { data: [] } })),
        MaintenanceService.getMy().catch(() => ({ data: { data: { payments: [] } } })),
        AnnouncementService.getAll().catch(() => ({ data: { data: [] } })),
        PreApprovalService.getMy().catch(() => ({ data: { data: [] } })),
        FrequentPassService.getMy().catch(() => ({ data: { data: [] } })),
      ]);
      setPending(pr.data?.data || []);
      setLogs(lr.data?.data?.items || lr.data?.data || []);
      setFlatStatus(br.data?.data?.flat || null);
      setPayments(br.data?.data?.payments || []);
      setAnnouncements(ar.data?.data?.items || ar.data?.data || []);
      setPreApprovals(par.data?.data || []);
      setPasses(fpr.data?.data || []);
    } catch {}
    setLoading(false);
  }, [activeSocietyId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load, activeSocietyId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const approve = async (id: string) => {
    try {
      await VisitorLogService.approve(id);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  const deny = async (id: string) => {
    try {
      await VisitorLogService.deny(id);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  const confirmDepart = async (id: string) => {
    try {
      await VisitorLogService.confirmDeparture(id);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  const submitRenewal = async () => {
    if (!form.utr_number || form.utr_number.length < 5) {
      return Alert.alert('Error', 'Please enter a valid UTR number');
    }
    try {
      await MaintenanceService.submitPayment({
        amount: modal.amount,
        months_added: modal.months_added,
        utr_number: form.utr_number,
      });
      setModal(null);
      load();
      Alert.alert('Payment Submitted', 'Your maintenance renewal was submitted for admin approval!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed');
    }
  };

  const openUPI = (amount: number) => {
    const upiId = process.env.EXPO_PUBLIC_UPI_ID || 'rm2residency@okhdfcbank';
    Linking.openURL(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(activeSociety?.name || 'RM2 Residency')}&am=${amount}&cu=INR`).catch(() => {
      Alert.alert('Error', 'No UPI app found. Please copy UPI ID and pay manually.');
    });
  };

  const openQuickPass = (purpose: string) => {
    const today = new Date().toISOString().split('T')[0];
    setForm({
      visitor_name: purpose === 'Delivery' ? 'Delivery Agent' : purpose === 'Cab' ? 'Cab Driver' : purpose === 'Service' ? 'Home Help / Service' : '',
      visitor_phone: '9999999999',
      purpose: purpose,
      valid_until: today,
    });
    setModal({ type: 'pre', defaultPurpose: purpose });
  };

  const createPre = async () => {
    if (!form.visitor_name || !form.valid_until) {
      return Alert.alert('Error', 'Please enter visitor name and valid until date');
    }
    try {
      await PreApprovalService.create({
        visitor_name: form.visitor_name,
        visitor_phone: form.visitor_phone || '9999999999',
        purpose: form.purpose || 'Guest',
        valid_until: form.valid_until,
      });
      setModal(null);
      load();
      Alert.alert('Gate Pass Created', `Pre-approval generated for ${form.visitor_name}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create pre-approval');
    }
  };

  const cancelPre = async (id: string) => {
    try {
      await PreApprovalService.cancel(id);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to cancel');
    }
  };

  const validUntil = flatStatus?.maintenance_valid_until ? new Date(flatStatus.maintenance_valid_until) : null;
  const isMaintenanceExpired = validUntil ? validUntil < new Date() : true;

  // Active Flat String (e.g. "23B" or "101")
  const activeFlatNumber = flatStatus?.flat_number || user?.flat_number || '23B';

  const userInitials = (user?.name || 'Resident')
    .split(' ')
    .map((w: string) => w[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ── Render Tab Content ─────────────────────────────────────────────────────
  const renderContent = () => {
    if (currentTab === 'dashboard') {
      return (
        <View>
          {/* 1. Live Gate Status (Hero Card) */}
          {pending.length > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Warm.amber, marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309', letterSpacing: 0.5 }}>
                  VISITOR WAITING AT GATE ({pending.length})
                </Text>
              </View>
              {pending.map((log: any) => (
                <View
                  key={log.id}
                  style={{
                    borderColor: Warm.amber,
                    borderWidth: 1.5,
                    backgroundColor: Warm.cardBg,
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 12,
                    ...Warm.shadow,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {log.visitor?.photo_url ? (
                      <Image
                        source={{
                          uri: log.visitor.photo_url.startsWith('http')
                            ? log.visitor.photo_url
                            : `${BASE_URL.replace('/api/v1', '')}${log.visitor.photo_url}`,
                        }}
                        style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Warm.amber }}
                      />
                    ) : (
                      <Avatar name={log.visitor?.name || 'V'} color={Warm.amber} size={60} />
                    )}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 18 }}>{log.visitor?.name}</Text>
                        <View style={{ backgroundColor: Warm.amberDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                          <Text style={{ color: '#B45309', fontSize: 11, fontWeight: '700' }}>At Gate</Text>
                        </View>
                      </View>
                      <Text style={{ color: Warm.accent, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                        Purpose: {log.purpose}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? ` · 🚗 ${log.vehicle_number}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => deny(log.id)}
                      style={{
                        flex: 1,
                        backgroundColor: Warm.redDim,
                        borderColor: Warm.red + '55',
                        borderWidth: 1,
                        borderRadius: 14,
                        paddingVertical: 13,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: Warm.red, fontWeight: '700', fontSize: 14 }}>✕ Deny Entry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => approve(log.id)}
                      style={{
                        flex: 1,
                        backgroundColor: Warm.green,
                        borderRadius: 14,
                        paddingVertical: 13,
                        alignItems: 'center',
                        shadowColor: Warm.green,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>✓ Allow In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{
              marginBottom: 20,
              padding: 16,
              backgroundColor: Warm.cardBg,
              borderColor: Warm.cardBorder,
              borderWidth: 1,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              ...Warm.shadow,
            }}>
              <View style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: Warm.greenDim,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
                <Text style={{ fontSize: 22 }}>🛡️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Warm.text, fontWeight: '800', fontSize: 15 }}>Gate Security Active</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>All quiet · No unauthorized visitors at gate.</Text>
              </View>
              <View style={{ backgroundColor: Warm.greenDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: Warm.green, fontSize: 11, fontWeight: '800' }}>SECURE</Text>
              </View>
            </View>
          )}

          {/* 2. Expecting a Visitor (One Big Clear Action) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setForm({ purpose: 'Guest' });
              setModal({ type: 'pre' });
            }}
            style={{
              marginBottom: 20,
              backgroundColor: Warm.cardBg,
              borderColor: Warm.cardBorder,
              borderWidth: 1.5,
              borderRadius: 22,
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              ...Warm.shadow,
            }}
          >
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: Warm.accentDim,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}>
              <Text style={{ fontSize: 26 }}>🎫</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text }}>
                  Expecting a Visitor?
                </Text>
                <View style={{ backgroundColor: Warm.greenDim, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: Warm.green, fontSize: 10, fontWeight: '800' }}>1-TAP PASS</Text>
                </View>
              </View>
              <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                Pre-approve Guest, Delivery, Cab, or Daily Help
              </Text>
            </View>
            <View style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: Warm.cardSubtle,
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 15 }}>➔</Text>
            </View>
          </TouchableOpacity>

          {/* 3. Society Maintenance & Status Card (Only shown if payment is due) */}
          {isMaintenanceExpired && (
            <View style={{
              marginBottom: 20,
              backgroundColor: '#FEF2F2',
              borderColor: '#FCA5A5',
              borderWidth: 1.5,
              borderRadius: 20,
              padding: 18,
              ...Warm.shadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15 }}>⚠️</Text>
                    <Text style={{ fontSize: 11, color: Warm.red, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 }}>
                      Society Maintenance Due
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginTop: 3 }}>
                    Monthly Dues Pending
                  </Text>
                  <Text style={{ color: Warm.textDim, fontSize: 12, marginTop: 2 }}>
                    {validUntil ? `Cycle ended ${validUntil.toLocaleDateString()}` : 'No active cycle recorded'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setForm({});
                    setModal({ type: 'renew', amount: 1200, months_added: 6 });
                  }}
                  style={{
                    backgroundColor: Warm.green,
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    shadowColor: Warm.green,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                    ⚡ Pay Dues
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 4. Last Visitor (Only shown if there is a visitor) */}
          {logs.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, letterSpacing: -0.2 }}>
                  Recent Visitor
                </Text>
                <TouchableOpacity onPress={() => setCurrentTab('history')}>
                  <Text style={{ color: Warm.accent, fontSize: 13, fontWeight: '700' }}>View All ({logs.length}) →</Text>
                </TouchableOpacity>
              </View>

              {logs.slice(0, 1).map((log: any) => {
                const isInside = log.status === 'inside' || log.approval_status === 'approved';
                const isDenied = log.approval_status === 'denied';
                const tagBg = isInside ? Warm.greenDim : isDenied ? Warm.redDim : Warm.amberDim;
                const tagFg = isInside ? Warm.green : isDenied ? Warm.red : '#B45309';

                return (
                  <View
                    key={log.id}
                    style={{
                      padding: 14,
                      backgroundColor: Warm.cardBg,
                      borderColor: Warm.cardBorder,
                      borderWidth: 1,
                      borderRadius: 16,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      ...Warm.shadow,
                    }}
                  >
                    <Avatar
                      name={log.visitor?.name || 'V'}
                      size={42}
                      color={isInside ? Warm.green : isDenied ? Warm.red : Warm.amber}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                        {log.purpose} · {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: tagBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={{ color: tagFg, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                        {log.status || log.approval_status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (currentTab === 'history') {
      return (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text }}>Visitor Activity Log</Text>
            <View style={{ backgroundColor: Warm.cardSubtle, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: Warm.textMuted, fontWeight: '700', fontSize: 12 }}>{logs.length} Total</Text>
            </View>
          </View>
          {logs.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 18, padding: 30, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 32 }}>📋</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', marginTop: 8 }}>No Visitor Logs Recorded</Text>
            </View>
          )}
          {logs.map((log: any) => {
            const isInside = log.status === 'inside';
            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: Warm.cardBg,
                  borderColor: Warm.cardBorder,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...Warm.shadow,
                }}
              >
                <Avatar name={log.visitor?.name || 'V'} size={42} color={Warm.accent} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                  <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                    {log.purpose} · {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: isInside ? Warm.greenDim : Warm.cardSubtle, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ color: isInside ? Warm.green : Warm.textMuted, fontSize: 11, fontWeight: '700' }}>
                      {log.status}
                    </Text>
                  </View>
                  {(log.status === 'inside' || log.status === 'overdue') && (
                    <TouchableOpacity onPress={() => confirmDepart(log.id)} style={{ marginTop: 8 }}>
                      <Text style={{ color: Warm.accent, fontSize: 12, fontWeight: '700' }}>Departed ➔</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (currentTab === 'passes') {
      return (
        <View>
          <TouchableOpacity
            onPress={() => { setForm({}); setModal({ type: 'pre' }); }}
            style={{
              backgroundColor: Warm.accent,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 18,
              shadowColor: Warm.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>+ Create New Pre-Approval Pass</Text>
          </TouchableOpacity>

          {preApprovals.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 18, padding: 30, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 32 }}>🎫</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', fontSize: 16, marginTop: 8 }}>No Active Gate Passes</Text>
              <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center' }}>
                Pre-approve guests or delivery agents for instant gate clearance.
              </Text>
            </View>
          )}

          {preApprovals.map((pa: any) => (
            <View
              key={pa.id}
              style={{
                backgroundColor: Warm.cardBg,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                ...Warm.shadow,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{pa.visitor_name}</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 13, marginTop: 2 }}>{pa.visitor_phone} · {pa.purpose || 'Guest'}</Text>
                <Text style={{ color: Warm.textDim, fontSize: 11, marginTop: 4 }}>
                  Valid until {new Date(pa.valid_until).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ backgroundColor: pa.status === 'active' ? Warm.greenDim : Warm.redDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: pa.status === 'active' ? Warm.green : Warm.red, fontSize: 11, fontWeight: '700' }}>
                    {pa.status}
                  </Text>
                </View>
                {pa.status === 'active' && (
                  <TouchableOpacity onPress={() => cancelPre(pa.id)} style={{ marginTop: 8 }}>
                    <Text style={{ color: Warm.red, fontSize: 12, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (currentTab === 'bills') {
      return (
        <View>
          <View style={{
            marginBottom: 20,
            borderColor: isMaintenanceExpired ? Warm.red : Warm.green,
            borderWidth: 1.5,
            backgroundColor: Warm.cardBg,
            borderRadius: 20,
            padding: 20,
            ...Warm.shadow,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: Warm.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Maintenance Dues Status
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: isMaintenanceExpired ? Warm.red : Warm.text }}>
                  {isMaintenanceExpired ? 'Due for Renewal' : 'Paid & Active'}
                </Text>
                <Text style={{ color: Warm.textMuted, fontSize: 13, marginTop: 4 }}>
                  {validUntil ? `Valid until: ${validUntil.toLocaleDateString()}` : 'No active cycle'}
                </Text>
              </View>
              <View style={{ backgroundColor: isMaintenanceExpired ? Warm.redDim : Warm.greenDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: isMaintenanceExpired ? Warm.red : Warm.green, fontSize: 11, fontWeight: '800' }}>
                  {isMaintenanceExpired ? 'EXPIRED' : 'ACTIVE'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => { setForm({}); setModal({ type: 'renew', amount: 1200, months_added: 6 }); }}
                style={{
                  flex: 1,
                  backgroundColor: '#0284C7',
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Renew 6M (₹1,200)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setForm({}); setModal({ type: 'renew', amount: 2400, months_added: 12 }); }}
                style={{
                  flex: 1,
                  backgroundColor: '#10B981',
                  borderRadius: 14,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Renew 1Y (₹2,400)</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginBottom: 12 }}>
            Payment History
          </Text>
          {payments.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 18, padding: 24, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 28 }}>💰</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', marginTop: 6 }}>No Payment Records</Text>
            </View>
          )}
          {payments.map((p: any) => (
            <View
              key={p.id}
              style={{
                backgroundColor: Warm.cardBg,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                ...Warm.shadow,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>
                  ₹{p.amount} ({p.months_added} Months)
                </Text>
                <Text style={{ color: Warm.textMuted, fontSize: 13, marginTop: 2 }}>
                  Submitted: {new Date(p.created_at).toLocaleDateString()}
                </Text>
                <Text style={{ color: Warm.textDim, fontSize: 11, marginTop: 2 }}>
                  UTR: {p.utr_number}
                </Text>
              </View>
              <View style={{ backgroundColor: p.status === 'approved' ? Warm.greenDim : p.status === 'rejected' ? Warm.redDim : Warm.amberDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ color: p.status === 'approved' ? Warm.green : p.status === 'rejected' ? Warm.red : '#B45309', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                  {p.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (currentTab === 'profile') {
      return (
        <View>
          <View style={{
            alignItems: 'center',
            padding: 30,
            backgroundColor: Warm.cardBg,
            borderColor: Warm.cardBorder,
            borderWidth: 1,
            borderRadius: 24,
            ...Warm.shadow,
          }}>
            <Avatar name={user?.name || '?'} size={80} color={Warm.accent} />
            <Text style={{ color: Warm.text, fontSize: 24, fontWeight: '800', marginTop: 16 }}>{user?.name}</Text>
            <Text style={{ color: Warm.textMuted, fontSize: 16, marginTop: 4 }}>{user?.phone}</Text>
            {user?.email && <Text style={{ color: Warm.textDim, fontSize: 13, marginTop: 4 }}>{user?.email}</Text>}
            <Text style={{ color: Warm.accent, fontSize: 15, fontWeight: '800', marginTop: 12 }}>
              🏢 {activeSociety?.name || 'RM2 Residency'} · Flat {activeFlatNumber}
            </Text>
            <View style={{ backgroundColor: Warm.accentDim, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 }}>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 11 }}>VERIFIED RESIDENT</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={logout}
            style={{
              backgroundColor: Warm.redDim,
              borderColor: Warm.red + '44',
              borderWidth: 1,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 20,
            }}
          >
            <Text style={{ color: Warm.red, fontWeight: '800', fontSize: 15 }}>Log Out of Resident Account</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Warm.bg }}>
      {/* ── Top Resident Header ── */}
      <View style={{
        backgroundColor: Warm.headerBg,
        paddingTop: Math.max(insets.top, 24) + 8,
        paddingBottom: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Warm.headerBorder,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Society / Flat Switcher Pill */}
          <SocietySwitcher theme="warm" flatNumber={activeFlatNumber} />

          {/* Right: Notification Bell & Profile Initials */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setCurrentTab('history')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#FFFFFF',
                borderColor: '#DDD6CC',
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#4A3E3D',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
              }}
            >
              <Text style={{ fontSize: 17 }}>🔔</Text>
              {pending.length > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: Warm.red,
                  borderWidth: 1.5,
                  borderColor: '#FFFFFF',
                }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentTab('profile')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#4A3E3D',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                {userInitials}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Main Body Scroll View ── */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 18, paddingTop: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Warm.accent} />}
      >
        <Animated.View {...panResponder.panHandlers} style={{ minHeight: Dimensions.get('window').height - 240, transform: [{ translateX: slideAnim }], paddingBottom: 85 + Math.max(insets.bottom, 16) }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Navigation Tab Bar (Clean 5-Tab Focused Bar) ── */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5DFD7',
        flexDirection: 'row',
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 16),
        paddingHorizontal: 8,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#4A3E3D',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 8,
      }}>
        {[
          { id: 'dashboard', label: 'Gate', icon: '🛡️' },
          { id: 'history', label: 'Visitors', icon: '👥' },
          { id: 'passes', label: 'Passes', icon: '🎫' },
          { id: 'bills', label: 'Dues', icon: '💰' },
          { id: 'profile', label: 'Profile', icon: '👤' },
        ].map((tab) => {
          const isAct = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setCurrentTab(tab.id)}
              style={{
                alignItems: 'center',
                paddingVertical: 5,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: isAct ? Warm.bg : 'transparent',
              }}
            >
              <Text style={{ fontSize: 18, opacity: isAct ? 1 : 0.55 }}>{tab.icon}</Text>
              <Text style={{
                color: isAct ? Warm.accent : '#94A3B8',
                fontSize: 11,
                fontWeight: isAct ? '800' : '600',
                marginTop: 2,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Renewal Modal ── */}
      {modal?.type === 'renew' && (
        <Modal title="Maintenance Payment" subtitle={`Amount: ₹${modal?.amount} for ${modal?.months_added} Months`} onClose={() => setModal(null)}>
          <Text style={{ color: Warm.textMuted, marginBottom: 14 }}>
            1. Tap below to launch your UPI application and complete payment.
          </Text>
          <Btn variant="blue" full onClick={() => openUPI(modal?.amount)} style={{ marginBottom: 20 }}>
            Pay via UPI (GPay / PhonePe / Paytm)
          </Btn>

          <Text style={{ color: Warm.textMuted, marginBottom: 8 }}>
            2. Enter the 12-digit UPI Reference / UTR Number:
          </Text>
          <Input
            label="UTR / Reference Number *"
            placeholder="e.g. 329182371928"
            value={form?.utr_number || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), utr_number: v }))}
          />
          <Btn full variant="green" onClick={submitRenewal} style={{ marginTop: 8 }}>
            Submit Proof for Approval →
          </Btn>
        </Modal>
      )}

      {/* ── Pre-Approval Modal ── */}
      {modal?.type === 'pre' && (
        <Modal
          title={`Pre-Approve Visitor`}
          subtitle="Generate instant gate clearance pass"
          onClose={() => setModal(null)}
        >
          {/* Visitor Category Filter */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: Warm.textMuted, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 }}>
              Visitor Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { id: 'Guest', label: 'Guest', icon: '👤' },
                { id: 'Delivery', label: 'Delivery', icon: '📦' },
                { id: 'Cab', label: 'Cab', icon: '🚗' },
                { id: 'Service', label: 'Daily Help / Service', icon: '🛠️' },
              ].map((cat) => {
                const isSel = (form?.purpose || 'Guest') === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setForm((prev: any) => ({ ...(prev || {}), purpose: cat.id }))}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: isSel ? Warm.accent : Warm.cardSubtle,
                      borderColor: isSel ? Warm.accent : Warm.cardBorder,
                      borderWidth: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                    <Text style={{
                      color: isSel ? '#FFFFFF' : Warm.text,
                      fontWeight: isSel ? '800' : '600',
                      fontSize: 13,
                    }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Input
            label="Visitor / Company Name *"
            placeholder={
              form?.purpose === 'Delivery'
                ? 'e.g. Swiggy / Zomato / Amazon agent'
                : form?.purpose === 'Cab'
                ? 'e.g. Uber / Ola driver'
                : form?.purpose === 'Service'
                ? 'e.g. Maid / Electrician / Plumber'
                : 'e.g. Rahul Sharma'
            }
            value={form?.visitor_name || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), visitor_name: v }))}
          />
          <Input
            label="Visitor Phone Number"
            placeholder={form?.purpose === 'Guest' ? '98765 43210 (Recommended)' : 'Phone number (Optional)'}
            value={form?.visitor_phone || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), visitor_phone: v }))}
          />
          <Text style={{ color: Warm.text, fontWeight: '700', fontSize: 14, marginTop: 12, marginBottom: 4 }}>
            Valid Until Date *
          </Text>
          <Calendar
            value={form?.valid_until || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), valid_until: v }))}
          />
          <Btn full onClick={createPre} style={{ marginTop: 16 }}>
            Issue Gate Pass →
          </Btn>
        </Modal>
      )}
    </View>
  );
}
