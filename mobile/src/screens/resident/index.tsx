import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView, Image, BackHandler, Linking, PanResponder, Dimensions, Animated, StyleSheet, RefreshControl, Switch } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisitorLogService, PreApprovalService, FrequentPassService, MaintenanceService, AnnouncementService, FlatUserService, AmenityService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, PageLayout, StatCard, EmptyState, LoadingScreen, Modal, Tabs, Calendar, SocietySwitcher, QuickActionTile } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';
import { formatTimestamp, formatDate } from '../../utils/date';

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
  const [showCalendar, setShowCalendar] = useState(false);

  const tabOrder = ['dashboard', 'history', 'passes', 'services', 'profile'];
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
  const [pendingFamily, setPendingFamily] = useState<any[]>([]);
  const [flatMembers, setFlatMembers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({ name: '', phone: '', relation: 'spouse' });
  const [approvingMemberId, setApprovingMemberId] = useState<string | null>(null);
  const [approvingRelation, setApprovingRelation] = useState('spouse');
  const [myFlatUser, setMyFlatUser] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const [notificationsMuted, setNotificationsMuted] = useState(user?.notifications_muted || false);
  const [playRingtone, setPlayRingtone] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('play_visitor_ringtone').then(val => {
      if (val !== null) setPlayRingtone(val === 'true');
    });
  }, []);

  const toggleRingtone = async (val: boolean) => {
    setPlayRingtone(val);
    await AsyncStorage.setItem('play_visitor_ringtone', String(val));
  };

  useEffect(() => {
    const manageSound = async () => {
      if (pending.length > 0 && playRingtone) {
        if (!soundRef.current) {
          try {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
            const { sound } = await Audio.Sound.createAsync(
              { uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
              { isLooping: true, volume: 1.0 }
            );
            soundRef.current = sound;
            await sound.playAsync();
          } catch (e) {
            console.log('Failed to play ringtone:', e);
          }
        }
      } else {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      }
    };
    manageSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().then(() => soundRef.current?.unloadAsync());
        soundRef.current = null;
      }
    };
  }, [pending.length, playRingtone]);

  const load = useCallback(async () => {
    if (user?.status === 'pending_verification') {
      setLoading(false);
      return;
    }
    try {
      const [pr, lr, br, ar, par, fpr, pfr, myfr, srv] = await Promise.all([
        VisitorLogService.getMyPending().catch(() => ({ data: { data: [] } })),
        VisitorLogService.getMyLogs({ per_page: 20 }).catch(() => ({ data: { data: [] } })),
        MaintenanceService.getMy().catch(() => ({ data: { data: { payments: [] } } })),
        AnnouncementService.getAll().catch(() => ({ data: { data: [] } })),
        PreApprovalService.getMy().catch(() => ({ data: { data: [] } })),
        FrequentPassService.getMy().catch(() => ({ data: { data: [] } })),
        FlatUserService.getPendingFamily().catch(() => ({ data: { data: [] } })),
        FlatUserService.getMyFlat().catch(() => ({ data: { data: [] } })),
        AmenityService.getAll({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
      ]);
      setPending(pr.data?.data || []);
      setLogs(lr.data?.data?.items || lr.data?.data || []);
      setFlatStatus(br.data?.data?.flat || null);
      setPayments(br.data?.data?.payments || []);
      setAnnouncements(ar.data?.data?.items || ar.data?.data || []);
      setPreApprovals(par.data?.data || []);
      setPasses(fpr.data?.data || []);
      setPendingFamily(pfr.data?.data || []);
      const allMembers = myfr?.data?.data || [];
      setFlatMembers(allMembers);
      const me = allMembers.find((m: any) => m.user_id === user?.id);
      setMyFlatUser(me || null);
      setServices(srv.data?.data || []);
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
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed' });
    }
  };

  const deny = async (id: string) => {
    try {
      await VisitorLogService.deny(id);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed' });
    }
  };

  const confirmDepart = async (id: string) => {
    try {
      await VisitorLogService.confirmDeparture(id);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed' });
    }
  };

  const submitRenewal = async () => {
    if (!form.utr_number || form.utr_number.length < 5) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid UTR number' });
    }
    try {
      await MaintenanceService.submitPayment({
        amount: modal.amount,
        months_added: modal.months_added,
        utr_number: form.utr_number,
      });
      setModal(null);
      load();
      Toast.show({ type: 'error', text1: 'Payment Submitted', text2: 'Your maintenance renewal was submitted for admin approval!' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed' });
    }
  };

  const approveFamilyMember = async (familyUser: any) => {
    try {
      await FlatUserService.approveFamily(familyUser.id, approvingRelation);
      load();
      Toast.show({ type: 'success', text1: 'Family Member Approved', text2: `${familyUser.name} can now access the flat.` });
      setApprovingMemberId(null);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to approve family member' });
    }
  };

  const updateOwnerStatus = async (isOwner: boolean) => {
    if (!myFlatUser?.id) return;
    try {
      await FlatUserService.update(myFlatUser.id, { is_owner: isOwner });
      load();
      Toast.show({ type: 'error', text1: 'Profile Updated', text2: `You are now marked as a ${isOwner ? 'Owner' : 'Tenant'}.` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to update profile' });
    }
  };

  const toggleNotifs = async (val: boolean) => {
    setNotificationsMuted(val);
    try {
      await UserService.toggleNotifications(val);
    } catch (e) {
      console.log('Failed to toggle notifs', e);
    }
  };

  const handlePromote = async (id: string) => {
    try {
      await FlatUserService.promote(id);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Member elevated to Primary' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed' });
    }
  };

  const handleDemote = async (id: string) => {
    try {
      await FlatUserService.demote(id);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Member demoted to Resident' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed' });
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await FlatUserService.remove(id);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Member removed from flat' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to remove member' });
    }
  };

  const handleAddMember = async () => {
    if (!addMemberForm.name || !addMemberForm.phone || addMemberForm.phone.length !== 10) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid name and 10-digit phone number' });
      return;
    }
    try {
      await FlatUserService.addMember({
        name: addMemberForm.name,
        phone: addMemberForm.phone,
        relation: addMemberForm.relation,
        move_in_date: new Date().toISOString().split('T')[0],
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Family member added' });
      setShowAddMember(false);
      setAddMemberForm({ name: '', phone: '', relation: 'spouse' });
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to add member' });
    }
  };

  const openUPI = (amount: number) => {
    const upiId = process.env.EXPO_PUBLIC_UPI_ID || 'rm2residency@okhdfcbank';
    Linking.openURL(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(activeSociety?.name || 'RM2 Residency')}&am=${amount}&cu=INR`).catch(() => {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No UPI app found. Please copy UPI ID and pay manually.' });
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
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter visitor name and valid until date' });
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
      Toast.show({ type: 'error', text1: 'Gate Pass Created', text2: `Pre-approval generated for ${form.visitor_name}` });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to create pre-approval' });
    }
  };

  const cancelPre = async (id: string) => {
    try {
      await PreApprovalService.cancel(id);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to cancel' });
    }
  };

  const validUntil = flatStatus?.maintenance_valid_until ? new Date(flatStatus.maintenance_valid_until) : null;
  const isMaintenanceExpired = validUntil ? validUntil < new Date() : true;
  const daysRemaining = validUntil ? Math.ceil((validUntil.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0;
  const shouldShowRenew = isMaintenanceExpired || (daysRemaining <= 15);

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
          {pending.length > 0 && (
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
                  <View style={{ marginBottom: 16 }}>
                    {log.visitor?.photo_url ? (
                      <Image
                        source={{
                          uri: log.visitor.photo_url.startsWith('http')
                            ? log.visitor.photo_url
                            : `${BASE_URL.replace('/api/v1', '')}${log.visitor.photo_url}`,
                        }}
                        style={{ width: '100%', height: 240, borderRadius: 14, backgroundColor: Warm.cardSubtle, resizeMode: 'cover' }}
                      />
                    ) : (
                      <View style={{ width: '100%', height: 240, borderRadius: 14, backgroundColor: Warm.cardSubtle, alignItems: 'center', justifyContent: 'center' }}>
                        <Avatar name={log.visitor?.name || 'V'} color={Warm.amber} size={100} />
                      </View>
                    )}
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 22 }}>{log.visitor?.name}</Text>
                      <Text style={{ color: Warm.accent, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                        Purpose: {log.purpose}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 14, marginTop: 4 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? ` · 🚗 ${log.vehicle_number}` : ''}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                        🕒 Arrived: {formatTimestamp(log.created_at)}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: Warm.amberDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: '#B45309', fontSize: 12, fontWeight: '700' }}>At {log.entry_gate?.name || 'Gate'}</Text>
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
          )}

          {/* 2. Expecting a Visitor (One Big Clear Action) */}
          {pending.length === 0 && !logs.some(l => l.status === 'inside') && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setForm({ purpose: 'Guest', entry_mode: 'foot', valid_until: new Date().toISOString().split('T')[0] });
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
                backgroundColor: Warm.greenDim,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
                <Text style={{ fontSize: 26 }}>🛡️</Text>
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
                  Gate is secure · Pre-approve guest or delivery
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
          )}

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
                    {validUntil ? `Cycle ended ${formatDate(validUntil)}` : 'No active cycle recorded'}
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
                        {log.purpose} · {formatTimestamp(log.created_at)}
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
            const getStatusColors = (status: string) => {
              switch(status.toLowerCase()) {
                case 'pending':
                  return { bg: '#FFFBEB', pillBg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
                case 'approved':
                case 'inside':
                  return { bg: '#F0FDF4', pillBg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
                case 'denied':
                case 'rejected':
                  return { bg: '#FEF2F2', pillBg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
                case 'overdue':
                  return { bg: '#FFF1F2', pillBg: '#FFE4E6', text: '#E11D48', border: '#FECDD3' };
                default:
                  return { bg: Warm.cardBg, pillBg: Warm.cardSubtle, text: Warm.textMuted, border: Warm.cardBorder };
              }
            };
            const colors = getStatusColors(log.status);
            
            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  borderWidth: 1.5,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...Warm.shadow,
                }}
              >
                <Avatar name={log.visitor?.name || 'V'} size={42} color={colors.text} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                  <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                    {log.purpose} · {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: colors.pillBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
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
            onPress={() => { setForm({ purpose: 'Guest', entry_mode: 'foot', valid_until: new Date().toISOString().split('T')[0] }); setModal({ type: 'pre' }); }}
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
                  Valid until {formatDate(pa.valid_until)}
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



    if (currentTab === 'services') {
      return (
        <View>
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text }}>Society Amenities</Text>
            <Text style={{ fontSize: 12, color: Warm.textMuted, marginTop: 4 }}>
              Facilities and key service contacts authorized by your society.
            </Text>
          </View>
          
          {services.length === 0 && (
            <EmptyState icon="🛠️" title="No Services Listed" message="Your society admin hasn't added any services yet." />
          )}

          {services.map((s: any) => (
            <View key={s.id} style={{
              backgroundColor: Warm.cardBg, borderColor: Warm.cardBorder, borderWidth: 1,
              borderRadius: 16, padding: 16, marginBottom: 10, ...Warm.shadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{s.name}</Text>
                  {s.description && <Text style={{ color: Warm.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{s.description}</Text>}
                  
                  <View style={{ marginTop: 10, gap: 4 }}>
                    {s.contact_info && (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${s.contact_info}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Warm.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 6, alignSelf: 'flex-start' }}
                      >
                        <Text style={{ fontSize: 14, marginRight: 8, color: '#FFFFFF' }}>📞</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Call {s.contact_info}</Text>
                      </TouchableOpacity>
                    )}
                    {s.timing && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, marginRight: 6 }}>🕒</Text>
                        <Text style={{ color: Warm.textMuted, fontSize: 12, fontWeight: '600' }}>{s.timing}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ backgroundColor: Warm.amberDim, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                  <Text style={{ color: '#B45309', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🛠️ {s.category || 'Service'}
                  </Text>
                </View>
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
          <View style={{
            marginTop: 20,
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
                  {validUntil ? `Valid until: ${formatDate(validUntil)}` : 'No active cycle'}
                </Text>
              </View>
              <View style={{ backgroundColor: isMaintenanceExpired ? Warm.redDim : Warm.greenDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: isMaintenanceExpired ? Warm.red : Warm.green, fontSize: 11, fontWeight: '800' }}>
                  {isMaintenanceExpired ? 'EXPIRED' : 'ACTIVE'}
                </Text>
              </View>
            </View>

            {shouldShowRenew && (
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
            )}
          </View>
          
          {myFlatUser && (
            <View style={{ marginTop: 24, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderColor: Warm.cardBorder, borderWidth: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginBottom: 12 }}>
                Occupancy Status
              </Text>
              <Text style={{ fontSize: 13, color: Warm.textMuted, marginBottom: 16 }}>
                Are you renting this flat, or are you the owner?
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => updateOwnerStatus(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: myFlatUser.is_owner ? '#F8F6F2' : Warm.accent,
                    borderColor: myFlatUser.is_owner ? Warm.cardBorder : Warm.accent,
                    borderWidth: 1,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontWeight: '800', color: myFlatUser.is_owner ? Warm.textMuted : '#FFF' }}>Tenant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateOwnerStatus(true)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: myFlatUser.is_owner ? Warm.accent : '#F8F6F2',
                    borderColor: myFlatUser.is_owner ? Warm.accent : Warm.cardBorder,
                    borderWidth: 1,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontWeight: '800', color: myFlatUser.is_owner ? '#FFF' : Warm.textMuted }}>Owner</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {pendingFamily.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginBottom: 12 }}>
                Pending Family Approvals
              </Text>
              {pendingFamily.map((pf: any) => (
                <View key={pf.id} style={{
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 16,
                  borderColor: '#E5DFD7',
                  borderWidth: 1,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar name={pf.name} size={44} color={Warm.accent} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text }}>{pf.name}</Text>
                      <Text style={{ fontSize: 13, color: Warm.textMuted }}>{pf.phone}</Text>
                    </View>
                    {approvingMemberId !== pf.id ? (
                      <TouchableOpacity
                        onPress={() => setApprovingMemberId(pf.id)}
                        style={{
                          backgroundColor: Warm.green,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Review</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setApprovingMemberId(null)}
                        style={{
                          backgroundColor: Warm.cardBorder,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: Warm.text, fontWeight: '800', fontSize: 13 }}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {approvingMemberId === pf.id && (
                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Warm.cardBorder }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Warm.text, marginBottom: 8 }}>Select Relationship:</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {['spouse', 'parent', 'child', 'sibling'].map(rel => (
                          <TouchableOpacity 
                            key={rel} 
                            onPress={() => setApprovingRelation(rel)}
                            style={{
                              backgroundColor: approvingRelation === rel ? Warm.accent : '#FFF',
                              borderColor: Warm.cardBorder, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: approvingRelation === rel ? '#FFF' : Warm.text, textTransform: 'capitalize' }}>
                              {rel}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TouchableOpacity
                        onPress={() => approveFamilyMember(pf)}
                        style={{
                          backgroundColor: Warm.green,
                          paddingVertical: 12,
                          borderRadius: 10,
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Confirm & Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Settings Toggle for Ringtone */}
          <View style={{ marginTop: 24, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderColor: Warm.cardBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Warm.shadow }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text }}>Loud Visitor Ringtone</Text>
              <Text style={{ fontSize: 13, color: Warm.textMuted, marginTop: 4 }}>Play a continuous alarm ringtone while a visitor is waiting at the gate.</Text>
            </View>
            <Switch
              value={playRingtone}
              onValueChange={toggleRingtone}
              trackColor={{ false: '#E5DFD7', true: Warm.green }}
              thumbColor={'#FFFFFF'}
            />
          </View>

          {/* Settings Toggle for Mute Notifications */}
          <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderColor: Warm.cardBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Warm.shadow }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text }}>Mute Push Notifications</Text>
              <Text style={{ fontSize: 13, color: Warm.textMuted, marginTop: 4 }}>Pause all alerts and SMS messages for visitor approvals.</Text>
            </View>
            <Switch
              value={notificationsMuted}
              onValueChange={toggleNotifs}
              trackColor={{ false: '#E5DFD7', true: Warm.amber }}
              thumbColor={'#FFFFFF'}
            />
          </View>

          {/* Flat Members Management */}
          {flatMembers.length > 0 && (
            <View style={{ marginTop: 24, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderColor: Warm.cardBorder, borderWidth: 1, ...Warm.shadow }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text }}>
                  Flat Members
                </Text>
                {myFlatUser?.role === 'primary' && !showAddMember && (
                  <TouchableOpacity onPress={() => setShowAddMember(true)} style={{ backgroundColor: Warm.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>+ Add Member</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showAddMember && (
                <View style={{ marginBottom: 16, backgroundColor: Warm.cardSubtle, padding: 12, borderRadius: 12 }}>
                  <Input 
                    placeholder="Full Name" 
                    value={addMemberForm.name} 
                    onChange={(v: string) => setAddMemberForm({...addMemberForm, name: v})} 
                  />
                  <View style={{ marginTop: 10 }}>
                    <Input 
                      placeholder="Phone (10 digits)" 
                      value={addMemberForm.phone} 
                      onChange={(v: string) => setAddMemberForm({...addMemberForm, phone: v.replace(/[^0-9]/g, '').slice(0, 10)})} 
                      keyboardType="number-pad" 
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    {['spouse', 'parent', 'child', 'sibling'].map(rel => (
                      <TouchableOpacity 
                        key={rel} 
                        onPress={() => setAddMemberForm({...addMemberForm, relation: rel})}
                        style={{
                          backgroundColor: addMemberForm.relation === rel ? Warm.accent : '#FFF',
                          borderColor: Warm.cardBorder, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: addMemberForm.relation === rel ? '#FFF' : Warm.text, textTransform: 'capitalize' }}>
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity onPress={() => setShowAddMember(false)} style={{ flex: 1, backgroundColor: Warm.cardBorder, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', color: Warm.text }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddMember} style={{ flex: 1, backgroundColor: Warm.accent, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', color: '#FFF' }}>Save Member</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {flatMembers.map((fm: any, idx: number) => (
                <View key={fm.id} style={{
                  flexDirection: 'row', alignItems: 'center',
                  marginBottom: idx === flatMembers.length - 1 ? 0 : 12,
                  paddingBottom: idx === flatMembers.length - 1 ? 0 : 12,
                  borderBottomWidth: idx === flatMembers.length - 1 ? 0 : 1,
                  borderBottomColor: Warm.cardBorder
                }}>
                  <Avatar name={fm.user?.name || '?'} size={40} color={Warm.accent} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: Warm.text }}>{fm.user?.name || 'Unknown'}</Text>
                      <View style={{ backgroundColor: fm.role === 'primary' ? Warm.greenDim : Warm.cardSubtle, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                         <Text style={{ fontSize: 9, fontWeight: '800', color: fm.role === 'primary' ? Warm.green : Warm.textMuted, textTransform: 'uppercase' }}>
                           {fm.role}
                         </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: Warm.textMuted, marginTop: 2 }}>{fm.user?.phone || 'No phone'}</Text>
                  </View>

                  {myFlatUser?.role === 'primary' && fm.user_id !== user?.id && (
                     <View style={{ flexDirection: 'row', gap: 8 }}>
                       <TouchableOpacity
                         onPress={() => fm.role === 'primary' ? handleDemote(fm.id) : handlePromote(fm.id)}
                         style={{
                           backgroundColor: fm.role === 'primary' ? Warm.amberDim : Warm.greenDim,
                           paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
                         }}
                       >
                         <Text style={{ fontSize: 11, fontWeight: '800', color: fm.role === 'primary' ? Warm.amber : Warm.green }}>
                           {fm.role === 'primary' ? 'Demote' : 'Make Primary'}
                         </Text>
                       </TouchableOpacity>
                       {fm.role !== 'primary' && (
                         <TouchableOpacity
                           onPress={() => handleRemoveMember(fm.id)}
                           style={{
                             backgroundColor: Warm.redDim,
                             paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
                           }}
                         >
                           <Text style={{ fontSize: 11, fontWeight: '800', color: Warm.red }}>
                             Remove
                           </Text>
                         </TouchableOpacity>
                       )}
                     </View>
                  )}
                </View>
              ))}
            </View>
          )}

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

  if (user?.status === 'pending_verification') {
    return (
      <View style={{ flex: 1, backgroundColor: Warm.bg, justifyContent: 'center', padding: 24 }}>
        <Card style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⏳</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: Warm.text, marginBottom: 8, textAlign: 'center' }}>
            Account Verification Pending
          </Text>
          <Text style={{ color: Warm.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            Your request to join <Text style={{ fontWeight: '700', color: Warm.text }}>{activeSociety?.name || user?.society_name || 'the society'}</Text> as a resident of Flat <Text style={{ fontWeight: '700', color: Warm.text }}>{activeFlatNumber}</Text> is currently under review. The Society Admin or the Primary Resident of this flat will need to approve your request before you can access the platform.
          </Text>
          <Btn full onClick={logout} variant="outline">Sign Out & Check Later</Btn>
        </Card>
      </View>
    );
  }

  if (!activeSocietyId && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Warm.bg, justifyContent: 'center', padding: 24 }}>
        <Card style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🏠</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: Warm.text, marginBottom: 8, textAlign: 'center' }}>
            No Active Flat
          </Text>
          <Text style={{ color: Warm.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            You are not currently assigned to any flat. If you were recently removed, you can request to join another flat by registering again, or ask a Primary Resident to add you directly.
          </Text>
          <Btn full onClick={logout} variant="outline">Sign Out</Btn>
        </Card>
      </View>
    );
  }

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
          { id: 'services', label: 'Services', icon: '🛠️' },
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
          <Input
            label="Visitor / Company Name *"
            placeholder="e.g. Rahul Sharma"
            value={form?.visitor_name || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), visitor_name: v }))}
          />
          <Input
            label="Visitor Phone Number"
            placeholder="98765 43210 (Recommended)"
            maxLength={10}
            keyboardType="number-pad"
            value={form?.visitor_phone || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), visitor_phone: v.replace(/[^0-9]/g, '') }))}
          />
          <Select
            label="Visitor Category *"
            value={form?.purpose || 'Guest'}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), purpose: v }))}
            options={[
              { value: 'Guest', label: '👤 Guest' },
              { value: 'Delivery', label: '📦 Delivery' },
              { value: 'Cab', label: '🚗 Cab' },
              { value: 'Service', label: '🛠️ Daily Help / Service' },
            ]}
          />
          <Select
            label="Mode of Entry"
            value={form?.entry_mode || 'foot'}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), entry_mode: v }))}
            options={[
              { value: 'foot', label: '🚶 On Foot' },
              { value: 'two_wheeler', label: '🏍️ Two Wheeler (Bike/Scooter)' },
              { value: 'four_wheeler', label: '🚗 Four Wheeler (Car/Cab)' },
            ]}
          />
          {form?.entry_mode && form.entry_mode !== 'foot' && (
            <Input
              label="Vehicle Number"
              placeholder="e.g. DL 01 AB 1234"
              value={form?.vehicle_number || ''}
              onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), vehicle_number: v }))}
              icon="🚗"
              autoCapitalize="characters"
            />
          )}
          <Text style={{ color: Warm.text, fontWeight: '700', fontSize: 14, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' }}>
            Valid Until Date *
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Warm.cardSubtle, borderColor: Warm.cardBorder, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 15, color: form?.valid_until ? Warm.text : Warm.textMuted }}>
              {form?.valid_until ? formatDate(form.valid_until) : 'Select Date'}
            </Text>
            <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </TouchableOpacity>
          </View>
          {showCalendar && (
            <View style={{ marginBottom: 12 }}>
              <Calendar
                value={form?.valid_until || ''}
                onChange={(v: string) => {
                  setForm((prev: any) => ({ ...(prev || {}), valid_until: v }));
                  setShowCalendar(false);
                }}
              />
            </View>
          )}
          <Btn full variant="green" onClick={createPre} style={{ marginTop: 16 }}>
            Issue Gate Pass →
          </Btn>
        </Modal>
      )}
    </View>
  );
}
