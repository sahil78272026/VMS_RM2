import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView, Image, BackHandler, Linking, PanResponder, Dimensions, Animated, StyleSheet, RefreshControl, Switch, ActivityIndicator, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VisitorLogService, PreApprovalService, FrequentPassService, MaintenanceService, AnnouncementService, FlatUserService, AmenityService, UserService, HelpdeskService, OCRService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, PageLayout, StatCard, EmptyState, LoadingScreen, Modal, Tabs, Calendar, SocietySwitcher, QuickActionTile } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../services/api';
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
  const [currentTab, setCurrentTab] = useState(route?.params?.tab || 'home');
  const [showCalendar, setShowCalendar] = useState(false);

  const tabOrder = ['home', 'dashboard', 'history', 'passes', 'services', 'profile'];
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
      if (currentTab !== 'home') {
        setCurrentTab('home');
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
  const [helpdeskTickets, setHelpdeskTickets] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(user?.notifications_muted || false);
  const [allowGuardForceEntry, setAllowGuardForceEntry] = useState(flatStatus?.allow_guard_force_entry || false);
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
    if (flatStatus) {
      setAllowGuardForceEntry(flatStatus.allow_guard_force_entry || false);
    }
  }, [flatStatus]);

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
      const [pr, lr, br, ar, par, fpr, pfr, myfr, srv, hr] = await Promise.all([
        VisitorLogService.getMyPending().catch(() => ({ data: { data: [] } })),
        VisitorLogService.getMyLogs({ per_page: 20 }).catch(() => ({ data: { data: [] } })),
        MaintenanceService.getMy().catch(() => ({ data: { data: { payments: [] } } })),
        AnnouncementService.getAll().catch(() => ({ data: { data: [] } })),
        PreApprovalService.getMy().catch(() => ({ data: { data: [] } })),
        FrequentPassService.getMy().catch(() => ({ data: { data: [] } })),
        FlatUserService.getPendingFamily().catch(() => ({ data: { data: [] } })),
        FlatUserService.getMyFlat().catch(() => ({ data: { data: [] } })),
        AmenityService.getAll({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        HelpdeskService.getMy().catch(() => ({ data: { data: { items: [] } } })),
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
      setHelpdeskTickets(hr.data?.data?.items || hr.data?.data || []);
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
        proof_url: form.receipt_url || null,
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

  const toggleForceEntry = async (val: boolean) => {
    if (!flatStatus) return;
    setAllowGuardForceEntry(val);
    try {
      await api.patch(`/flats/${flatStatus.id}/settings`, { allow_guard_force_entry: val });
    } catch (e) {
      console.log('Failed to toggle force entry', e);
      setAllowGuardForceEntry(!val); // rollback on fail
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

  const handleMoveOut = async () => {
    Alert.alert(
      "Confirm Move Out",
      "Are you sure you want to move out? You will lose access to this flat.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Move Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await FlatUserService.moveOut();
              Toast.show({ type: 'success', text1: 'Moved Out', text2: 'You have been moved out successfully' });
              logout(); // Log out or refresh to trigger "No Active Flat" fallback
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to move out' });
            }
          }
        }
      ]
    );
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
    const upiId = activeSociety?.upi_id || process.env.EXPO_PUBLIC_UPI_ID || 'rm2residency@okhdfcbank';
    Linking.openURL(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(activeSociety?.name || 'RM2 Residency')}&am=${amount}&cu=INR`).catch(() => {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No UPI app found. Please copy UPI ID and pay manually.' });
    });
  };

  const openQuickPass = (purpose: string) => {
    setForm({
      visitor_name: purpose === 'Delivery' ? 'Delivery Agent' : purpose === 'Cab' ? 'Cab Driver' : purpose === 'Service' ? 'Home Help / Service' : '',
      visitor_phone: '9999999999',
      purpose: purpose,
    });
    setModal({ type: 'pre', defaultPurpose: purpose });
  };

  const createTicket = async () => {
    if (!form?.title || !form?.description) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill title and description' });
      return;
    }
    try {
      await HelpdeskService.create({
        title: form.title,
        description: form.description,
        category: form.category || 'other',
        priority: form.priority || 'medium',
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Ticket raised successfully' });
      setModal(null);
      setForm({});
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to raise ticket' });
    }
  };

  const createPre = async () => {
    if (!form.visitor_name) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter visitor name' });
    }
    try {
      await PreApprovalService.create({
        visitor_name: form.visitor_name,
        visitor_phone: form.visitor_phone || '9999999999',
        purpose: form.purpose || 'Guest',
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

  const [ocrLoading, setOcrLoading] = useState(false);

  const handleUploadScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0].uri) {
        setOcrLoading(true);
        const uri = result.assets[0].uri;
        
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'screenshot.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        if (Platform.OS === 'web') {
          const fetchRes = await fetch(uri);
          const blob = await fetchRes.blob();
          formData.append('file', blob, filename);
        } else {
          formData.append('file', {
            uri,
            name: filename,
            type,
          } as any);
        }

        const res = await OCRService.scanUtr(formData);
        
        if (res.data?.data?.utr_code) {
          setForm((prev: any) => ({ ...(prev || {}), utr_number: res.data.data.utr_code, proof_url: uri, proof_filename: filename, receipt_url: res.data.data.receipt_url }));
          Toast.show({ type: 'success', text1: 'Success', text2: `UTR ${res.data.data.utr_code} extracted automatically!` });
        } else {
          setForm((prev: any) => ({ ...(prev || {}), proof_url: uri, proof_filename: filename, receipt_url: res.data?.data?.receipt_url }));
          Toast.show({ type: 'error', text1: 'Not Found', text2: 'Could not detect UTR code in the screenshot. Please enter it manually.' });
        }
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to scan image for UTR code.' });
    } finally {
      setOcrLoading(false);
    }
  };

  const submitDonation = async () => {
    if (!form?.utr_number || !form?.amount) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter amount and UTR number' });
    }
    try {
      await api.post('/societies/donate', {
        amount: parseFloat(form.amount),
        utr_number: form.utr_number,
        purpose: form.purpose || 'Society Welfare Fund',
        receipt_url: form.receipt_url || null
      });
      Toast.show({ type: 'success', text1: 'Donation Submitted', text2: 'Thank you for your contribution to the society welfare!' });
      setModal(null);
      setForm({});
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to submit donation' });
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
    if (currentTab === 'home') {
      return (
        <View>
          <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: Warm.text }}>
              Flat {activeFlatNumber}
            </Text>
            <Text style={{ fontSize: 16, color: Warm.textMuted, marginTop: 4 }}>
              {user?.name || 'Resident'}
            </Text>
          </View>

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

          {/* Donation Quick Action */}


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
                        {log.expected_exit_by ? ` · Exit by: ${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 14, marginTop: 4 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? ` · ${log.entry_mode === 'two_wheeler' ? '🛵' : '🚗'} ${log.vehicle_number}` : log.entry_mode === 'foot' ? ' · 🚶 On Foot' : ` · ${log.entry_mode === 'two_wheeler' ? '🛵 Two Wheeler' : '🚗 Four Wheeler'}`}
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
                setForm({ purpose: 'Guest', entry_mode: 'foot' });
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


        
          {/* Announcements */}
          {announcements.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text }}>📢 Latest Announcements</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, gap: 12 }}>
                {announcements.map((ann: any) => (
                  <View key={ann.id} style={{
                    backgroundColor: ann.priority === 'urgent' ? Warm.redDim : Warm.cardBg,
                    borderColor: ann.priority === 'urgent' ? '#FCA5A5' : Warm.cardBorder,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    width: width * 0.75,
                    ...Warm.shadow,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: Warm.textMuted, textTransform: 'uppercase' }}>
                        {formatTimestamp(ann.created_at)}
                      </Text>
                      {ann.priority === 'urgent' && <Badge label="URGENT" variant="danger" />}
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: Warm.text, marginBottom: 4 }} numberOfLines={2}>
                      {ann.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: Warm.textMuted, lineHeight: 18 }} numberOfLines={3}>
                      {ann.body}
                    </Text>
                  </View>
                ))}
              </ScrollView>
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
                const derivedState = (log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? 'not_answered' : ((log.status === 'expected' || log.status === 'denied') && log.approval_status ? log.approval_status : log.status);
                let cardBg = Warm.cardBg;
                let cardBorder = Warm.cardBorder;
                let tagBg = Warm.cardSubtle;
                let tagFg = Warm.textMuted;
                
                switch(derivedState) {
                  case 'pending': cardBg = '#FEF3C7'; cardBorder = '#FDE68A'; tagBg = '#FDE68A'; tagFg = '#92400E'; break;
                  case 'approved': cardBg = '#E0F2FE'; cardBorder = '#BAE6FD'; tagBg = '#BAE6FD'; tagFg = '#0369A1'; break;
                  case 'denied': cardBg = '#FFE4E6'; cardBorder = '#FECDD3'; tagBg = '#FECDD3'; tagFg = '#E11D48'; break;
                  case 'not_answered': cardBg = '#F3F4F6'; cardBorder = '#D1D5DB'; tagBg = '#E5E7EB'; tagFg = '#6B7280'; break;
                  case 'inside': cardBg = '#D1FAE5'; cardBorder = '#A7F3D0'; tagBg = '#A7F3D0'; tagFg = '#059669'; break;
                  case 'overdue': cardBg = '#FEE2E2'; cardBorder = '#FCA5A5'; tagBg = '#FCA5A5'; tagFg = '#DC2626'; break;
                  case 'exited': cardBg = '#F3F4F6'; cardBorder = '#E5E7EB'; tagBg = '#E5E7EB'; tagFg = '#4B5563'; break;
                  case 'unconfirmed_exit': cardBg = '#FFEDD5'; cardBorder = '#FDBA74'; tagBg = '#FDBA74'; tagFg = '#C2410C'; break;
                  case 'cancelled': cardBg = '#F3F4F6'; cardBorder = '#D1D5DB'; tagBg = '#D1D5DB'; tagFg = '#374151'; break;
                  default: break;
                }

                return (
                  <View
                    key={log.id}
                    style={{
                      padding: 14,
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
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
                      color={tagFg}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ color: Warm.textMuted, fontSize: 12 }}>
                          {log.purpose} · {formatTimestamp(log.created_at)}
                        </Text>
                        {log.status === 'exited' && log.actual_exit_at ? (
                          <Text style={{ color: Warm.textMuted, fontSize: 12, fontWeight: '700' }}>
                            • Exited: {new Date(log.actual_exit_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                        ) : log.expected_exit_by ? (
                          <Text style={{ color: Warm.amber, fontSize: 12, fontWeight: '600' }}>
                            • Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                        ) : null}
                      </View>
                      {log.is_force_approved && (
                        <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700', marginTop: 3 }}>
                          ⚠ Forced Entry: {log.force_approve_reason || 'No reason provided'}
                        </Text>
                      )}
                    </View>
                    <View style={{ backgroundColor: tagBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={{ color: tagFg, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                        {derivedState.replace('_', ' ')}
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
          {logs.slice(0, 3).map((log: any) => {
            const derivedState = (log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? 'not_answered' : ((log.status === 'expected' || log.status === 'denied') && log.approval_status ? log.approval_status : log.status);
            let cardBg = Warm.cardBg;
            let cardBorder = Warm.cardBorder;
            let tagBg = Warm.cardSubtle;
            let tagFg = Warm.textMuted;
            
            switch(derivedState) {
              case 'pending': cardBg = '#FEF3C7'; cardBorder = '#FDE68A'; tagBg = '#FDE68A'; tagFg = '#92400E'; break;
              case 'approved': cardBg = '#E0F2FE'; cardBorder = '#BAE6FD'; tagBg = '#BAE6FD'; tagFg = '#0369A1'; break;
              case 'denied': cardBg = '#FFE4E6'; cardBorder = '#FECDD3'; tagBg = '#FECDD3'; tagFg = '#E11D48'; break;
              case 'not_answered': cardBg = '#F3F4F6'; cardBorder = '#D1D5DB'; tagBg = '#E5E7EB'; tagFg = '#6B7280'; break;
              case 'inside': cardBg = '#D1FAE5'; cardBorder = '#A7F3D0'; tagBg = '#A7F3D0'; tagFg = '#059669'; break;
              case 'overdue': cardBg = '#FEE2E2'; cardBorder = '#FCA5A5'; tagBg = '#FCA5A5'; tagFg = '#DC2626'; break;
              case 'exited': cardBg = '#F3F4F6'; cardBorder = '#E5E7EB'; tagBg = '#E5E7EB'; tagFg = '#4B5563'; break;
              case 'unconfirmed_exit': cardBg = '#FFEDD5'; cardBorder = '#FDBA74'; tagBg = '#FDBA74'; tagFg = '#C2410C'; break;
              case 'cancelled': cardBg = '#F3F4F6'; cardBorder = '#D1D5DB'; tagBg = '#D1D5DB'; tagFg = '#374151'; break;
              default: break;
            }
            
            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: 1.5,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...Warm.shadow,
                }}
              >
                <Avatar name={log.visitor?.name || 'V'} size={42} color={tagFg} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                  <View style={{ marginTop: 2 }}>
                    <Text style={{ color: Warm.textMuted, fontSize: 12, marginBottom: 8 }}>
                      {log.purpose}
                      {log.expected_exit_by && !log.actual_exit_at ? ` · Exit by: ${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                    </Text>

                    {/* Last Action Snippet & Expand Button */}
                    <TouchableOpacity 
                      onPress={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: cardBorder, paddingTop: 8 }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {expandedLogId === log.id ? (
                          <Text style={{ color: Warm.textMuted, fontSize: 11, fontWeight: '700' }}>Activity Log</Text>
                        ) : log.actual_exit_at ? (
                          <>
                            <Text style={{ fontSize: 10 }}>🚪</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)}</Text>
                          </>
                        ) : log.entered_at ? (
                          <>
                            <Text style={{ fontSize: 10 }}>🚶</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>Entered</Text> at {formatTimestamp(log.entered_at)}</Text>
                          </>
                        ) : (log.approval_status !== 'pending' || log.status === 'denied') ? (
                          <>
                            <Text style={{ fontSize: 10 }}>{(log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? '⏰' : log.approval_status === 'approved' ? '✅' : '❌'}</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>{(log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? 'Not Answered' : log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text>{(log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? ' (Auto Expired)' : ` at ${formatTimestamp(log.approved_at)}`}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={{ fontSize: 10 }}>📝</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>Logged</Text> at {formatTimestamp(log.created_at)}</Text>
                          </>
                        )}
                      </View>
                      <Text style={{ color: tagFg, fontSize: 10, fontWeight: '800' }}>
                        {expandedLogId === log.id ? 'HIDE ▴' : 'DETAILS ▾'}
                      </Text>
                    </TouchableOpacity>

                    {/* Detailed Activity Timeline */}
                    {expandedLogId === log.id && (
                      <View style={{ paddingTop: 8, gap: 4, marginTop: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>📝</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>Logged</Text> by {log.approval_source === 'self_checkin' ? 'Visitor (Self)' : (log.guard_name || 'Guard')} at {formatTimestamp(log.created_at)}
                          </Text>
                        </View>

                        {(log.approval_status !== 'pending' || log.status === 'denied') && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 10 }}>{(log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? '⏰' : log.approval_status === 'approved' ? '✅' : '❌'}</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                              <Text style={{ fontWeight: '700' }}>{(log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? 'Not Answered' : log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text> 
                              {(log.approval_status === 'not_answered' || (log.status === 'denied' && log.approval_status === 'pending')) ? ' (Exceeded 30 mins wait time)' : ` by ${log.approver_name || 'Resident'} at ${formatTimestamp(log.approved_at)}`}
                            </Text>
                          </View>
                        )}

                        {log.entered_at && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 10 }}>🚶</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                              <Text style={{ fontWeight: '700' }}>Entered</Text> at {formatTimestamp(log.entered_at)}
                            </Text>
                          </View>
                        )}

                        {log.actual_exit_at && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 10 }}>🚪</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                              <Text style={{ fontWeight: '700' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)}
                              {log.exit_confirmed_by ? ` (Marked by ${log.exit_confirmed_by})` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  {log.is_force_approved && (
                    <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700', marginTop: 6 }}>
                      ⚠ Forced Entry: {log.force_approve_reason || 'No reason provided'}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: tagBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                    <Text style={{ color: tagFg, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                      {derivedState.replace('_', ' ')}
                    </Text>
                  </View>
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
            onPress={() => { setForm({ purpose: 'Guest', entry_mode: 'foot' }); setModal({ type: 'pre' }); }}
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

          <View style={{ marginTop: 30, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text }}>My Support Tickets</Text>
              <Text style={{ fontSize: 12, color: Warm.textMuted, marginTop: 4 }}>
                Raise issues like plumbing, electrical, or security.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModal('create_ticket')}
              style={{ backgroundColor: Warm.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
            >
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>+ New</Text>
            </TouchableOpacity>
          </View>

          {helpdeskTickets.length === 0 && (
            <EmptyState icon="📝" title="No Tickets" message="You haven't raised any support tickets." />
          )}

          {helpdeskTickets.map((t: any) => {
            const isClosed = t.status === 'resolved' || t.status === 'closed';
            const isInProgress = t.status === 'in_progress';
            const bgCol = isClosed ? '#F0FDF4' : isInProgress ? '#FEF3C7' : '#EFF6FF';
            const borderCol = isClosed ? '#86EFAC' : isInProgress ? '#FDE047' : '#BFDBFE';
            const badgeColor = isClosed ? 'green' : isInProgress ? 'amber' : 'blue';

            return (
              <View key={t.id} style={{
                backgroundColor: bgCol, borderColor: borderCol, borderWidth: 1,
                borderRadius: 16, padding: 16, marginBottom: 10, ...Warm.shadow,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{t.title}</Text>
                    <Text style={{ color: Warm.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{t.description}</Text>
                    {t.comments && (
                      <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.6)', padding: 10, borderRadius: 8 }}>
                        {(() => {
                          try {
                            const logs = JSON.parse(t.comments);
                            if (Array.isArray(logs)) {
                              return logs.map((log: any, idx: number) => (
                                <View key={idx} style={{ marginBottom: idx < logs.length - 1 ? 8 : 0, borderBottomWidth: idx < logs.length - 1 ? 1 : 0, borderBottomColor: Warm.cardBorder, paddingBottom: idx < logs.length - 1 ? 8 : 0 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '800', color: Warm.textMuted, marginBottom: 2 }}>{log.author?.toUpperCase() || 'ADMIN'} • {formatTimestamp(log.timestamp)}</Text>
                                  <Text style={{ fontSize: 13, color: Warm.text }}>{log.text}</Text>
                                </View>
                              ));
                            }
                          } catch {}
                          return (
                            <>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: Warm.textMuted, marginBottom: 2 }}>ADMIN REPLY:</Text>
                              <Text style={{ fontSize: 13, color: Warm.text }}>{t.comments}</Text>
                            </>
                          );
                        })()}
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <Text style={{ fontSize: 12, color: Warm.textMuted }}>{formatTimestamp(t.created_at)}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Badge color={badgeColor}>{t.status.replace('_', ' ')}</Badge>
                  </View>
                </View>
              </View>
            );
          })}
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

          {/* Settings Toggle for Guard Force Entry */}
          <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderColor: Warm.cardBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Warm.shadow }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text }}>Allow Guard Force Entry</Text>
              <Text style={{ fontSize: 13, color: Warm.textMuted, marginTop: 4 }}>Allow the guard to force-approve a waiting visitor if you don't respond within 1 minute.</Text>
            </View>
            <Switch
              value={allowGuardForceEntry}
              onValueChange={toggleForceEntry}
              trackColor={{ false: '#E5DFD7', true: Warm.red }}
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
            onPress={handleMoveOut}
            style={{
              backgroundColor: Warm.red,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 20,
              shadowColor: Warm.red,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>Move Out of Flat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={logout}
            style={{
              backgroundColor: Warm.redDim,
              borderColor: Warm.red + '44',
              borderWidth: 1,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 10,
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
            {/* Donate Icon */}
            <TouchableOpacity
              onPress={() => {
                setForm({ amount: '500', purpose: 'Society Welfare Fund' });
                setModal({ type: 'donate' });
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F0F9FF',
                borderColor: '#BAE6FD',
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#4A3E3D',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
              }}
            >
              <Text style={{ fontSize: 16 }}>❤️</Text>
            </TouchableOpacity>
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
          { id: 'home', label: 'Home', icon: '🏠' },
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

          {form?.proof_url ? (
            <View style={{ marginBottom: 16, alignItems: 'center' }}>
              <Image source={{ uri: form.proof_url }} style={{ width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' }} />
              {form?.proof_filename && (
                <Text style={{ marginTop: 8, fontSize: 13, color: Warm.textMuted, fontWeight: '700' }}>
                  📎 {form.proof_filename}
                </Text>
              )}
              <TouchableOpacity onPress={() => setForm((prev: any) => ({ ...prev, proof_url: null, proof_filename: null, utr_number: '' }))} style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleUploadScreenshot} disabled={ocrLoading} style={{ backgroundColor: Warm.cardSubtle, borderColor: Warm.cardBorder, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 }}>
              {ocrLoading ? <ActivityIndicator size="large" color={Warm.accent} style={{ marginBottom: 10 }} /> : <Text style={{ fontSize: 24 }}>📸</Text>}
              <Text style={{ color: Warm.textMuted, marginTop: 8, fontWeight: '600' }}>
                {ocrLoading ? 'Scanning image for UTR Code...' : 'Upload Payment Screenshot'}
              </Text>
              <Text style={{ color: Warm.textDim, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                We will automatically extract the UTR code
              </Text>
            </TouchableOpacity>
          )}

          {!form?.utr_number ? (
            <View>
              <Text style={{ color: Warm.textMuted, marginBottom: 8 }}>
                Or manually enter the 12-digit UPI Reference / UTR Number:
              </Text>
              <Input
                label="UTR / Reference Number *"
                placeholder="e.g. 329182371928"
                value={form?.utr_number || ''}
                onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), utr_number: v }))}
              />
              <Btn full variant="green" onClick={submitRenewal} style={{ marginTop: 8 }} disabled={!form?.utr_number}>
                Submit Proof for Approval →
              </Btn>
            </View>
          ) : (
            <Btn full variant="green" onClick={submitRenewal} style={{ marginTop: 8 }}>
              ✓ Confirm UTR {form.utr_number} & Submit
            </Btn>
          )}
        </Modal>
      )}

      {/* ── Donation Modal ── */}
      {modal?.type === 'donate' && (
        <Modal title="Society Donation" subtitle="Support your community welfare" onClose={() => setModal(null)}>
          <Input
            label="Donation Amount (₹)"
            placeholder="e.g. 500"
            value={form?.amount || '500'}
            keyboardType="number-pad"
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), amount: v }))}
          />
          <Btn variant="blue" full onClick={() => openUPI(parseFloat(form?.amount || '500'))} style={{ marginBottom: 20 }}>
            Pay via UPI (GPay / PhonePe / Paytm)
          </Btn>

          {form?.proof_url ? (
            <View style={{ marginBottom: 16, alignItems: 'center' }}>
              <Image source={{ uri: form.proof_url }} style={{ width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover' }} />
              {form?.proof_filename && (
                <Text style={{ marginTop: 8, fontSize: 13, color: Warm.textMuted, fontWeight: '700' }}>
                  📎 {form.proof_filename}
                </Text>
              )}
              <TouchableOpacity onPress={() => setForm((prev: any) => ({ ...prev, proof_url: null, proof_filename: null, utr_number: '' }))} style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleUploadScreenshot} disabled={ocrLoading} style={{ backgroundColor: Warm.cardSubtle, borderColor: Warm.cardBorder, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 }}>
              {ocrLoading ? <ActivityIndicator size="large" color={Warm.accent} style={{ marginBottom: 10 }} /> : <Text style={{ fontSize: 24 }}>📸</Text>}
              <Text style={{ color: Warm.textMuted, marginTop: 8, fontWeight: '600' }}>
                {ocrLoading ? 'Scanning image for UTR Code...' : 'Upload Payment Screenshot'}
              </Text>
              <Text style={{ color: Warm.textDim, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                We will automatically extract the UTR code
              </Text>
            </TouchableOpacity>
          )}

          {!form?.utr_number ? (
            <View>
              <Input
                label="UTR / Reference Number *"
                placeholder="e.g. 329182371928"
                value={form?.utr_number || ''}
                onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), utr_number: v }))}
              />
              <Btn full variant="green" onClick={submitDonation} style={{ marginTop: 8 }} disabled={!form?.utr_number}>
                Submit Donation →
              </Btn>
            </View>
          ) : (
            <Btn full variant="green" onClick={submitDonation} style={{ marginTop: 8 }}>
              ✓ Confirm UTR {form.utr_number} & Submit
            </Btn>
          )}
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
          <Btn full variant="green" onClick={createPre} style={{ marginTop: 16 }}>
            Issue Gate Pass →
          </Btn>
        </Modal>
      )}

      {modal === 'create_ticket' && (
        <Modal visible onClose={() => { setModal(null); setForm({}); }} title="Raise Support Ticket">
          <Input
            label="Issue Title *"
            placeholder="e.g. Broken streetlight near block A"
            value={form?.title || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), title: v }))}
          />
          <Input
            label="Description *"
            placeholder="Please describe the issue in detail"
            value={form?.description || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), description: v }))}
            multiline
          />
          <Select
            label="Category"
            value={form?.category || 'other'}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), category: v }))}
            options={[
              { value: 'plumbing', label: '🚰 Plumbing' },
              { value: 'electrical', label: '⚡ Electrical' },
              { value: 'cleaning', label: '🧹 Cleaning / Janitorial' },
              { value: 'security', label: '🛡️ Security' },
              { value: 'other', label: '📋 Other' },
            ]}
          />
          <Select
            label="Priority"
            value={form?.priority || 'medium'}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), priority: v }))}
            options={[
              { value: 'low', label: '🟢 Low' },
              { value: 'medium', label: '🟡 Medium' },
              { value: 'high', label: '🔴 High (Urgent)' },
            ]}
          />
          <Btn full variant="primary" onClick={createTicket} style={{ marginTop: 16 }}>
            Submit Ticket
          </Btn>
        </Modal>
      )}
    </View>
  );
}
