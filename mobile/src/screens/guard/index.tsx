import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, ScrollView, BackHandler, PanResponder, Dimensions, Animated, TouchableOpacity, RefreshControl, TextInput, Platform, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { VisitorLogService, GateSessionService, GateService, FlatService, PreApprovalService, GuardService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, SearchableSelect, MultiSearchableSelect, StatCard, EmptyState, LoadingScreen, SocietySwitcher, Modal } from '../../components/UI';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { formatTimestamp } from '../../utils/date';

const { width } = Dimensions.get('window');

const Warm = {
  bg: '#F4F0EA',
  headerBg: '#EBE5DC',
  headerBorder: '#DDD6CC',
  cardBg: '#FFFFFF',
  cardBorder: '#E5DFD7',
  cardSubtle: '#F8F6F2',
  text: '#1E293B',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  accent: '#0284C7',
  accentDim: '#E0F2FE',
  green: '#10B981',
  greenDim: '#DCFCE7',
  amber: '#F59E0B',
  amberDim: '#FEF3C7',
  red: '#EF4444',
  redDim: '#FEE2E2',
  shadow: {
    shadowColor: '#4A3E3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

export function GuardDashboard({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout, activeSociety, activeSocietyId } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const tabOrder = ['dashboard', 'inside', 'qr', 'profile'];
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 15,
    onPanResponderRelease: (_, gs) => {
      if (Math.abs(gs.dx) > 30 && Math.abs(gs.vx) > 0.15) {
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

  const [logs, setLogs] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [inside, setInside] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [gates, setGates] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQrGateId, setSelectedQrGateId] = useState<number | null>(null);
  
  const [selectedGuard, setSelectedGuard] = useState<any>(null);
  const [pinModal, setPinModal] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [targetGateId, setTargetGateId] = useState('');
  const [availableGuards, setAvailableGuards] = useState<any[]>([]);

  const [forceAllowModal, setForceAllowModal] = useState<any>(null);
  const [forceAllowReason, setForceAllowReason] = useState('');

  const [visitorSubTab, setVisitorSubTab] = useState<'inside'|'all'>('inside');
  const [now, setNow] = useState(Date.now());

  const [form, setForm] = useState<any>({ entry_mode: 'foot', stay_duration: '1_2hr', purpose: 'Guest' });

  const load = useCallback(async (isRefresh = false) => {
    try {
      // 1. Fetch Session
      const sr = await GateSessionService.getActive().catch(() => ({ data: { data: [] } }));
      const sessions = sr.data?.data || [];
      const activeSession = sessions.find((s: any) => !s.shift_end) || null;
      setSession(activeSession);

      // 2. Route based on Session state
      if (activeSession) {
        const [lr, pr, ir] = await Promise.all([
          VisitorLogService.getLogs().catch(() => ({ data: { data: [] } })),
          VisitorLogService.getPending().catch(() => ({ data: { data: [] } })),
          VisitorLogService.getInside().catch(() => ({ data: { data: [] } })),
        ]);
        setLogs(lr.data?.data?.items || lr.data?.data || []);
        setPending(pr.data?.data || []);
        setInside(ir.data?.data || []);

        if (flats.length === 0 || isRefresh) {
          const fr = await FlatService.getAll({ per_page: 5000, society_id: activeSocietyId }).catch(() => ({ data: { data: [] } }));
          const rawFlats = fr.data?.data?.items || fr.data?.data || [];
          rawFlats.sort((a: any, b: any) => a.flat_number.replace(/\d+/g, (n: any) => n.padStart(5, '0')).localeCompare(b.flat_number.replace(/\d+/g, (n: any) => n.padStart(5, '0'))));
          setFlats(rawFlats);
        }
      } else {
        const [gr, guardRes] = await Promise.all([
          GateService.getAll().catch(() => ({ data: { data: [] } })),
          GuardService.getAll({ per_page: 50 }).catch(() => ({ data: { data: [] } })),
        ]);
        const fetchedGates = gr.data?.data?.items || gr.data?.data || [];
        setGates(fetchedGates);
        if (fetchedGates.length === 1) {
          setTargetGateId(fetchedGates[0].id);
        }
        const rawGuards = guardRes.data?.data?.items || guardRes.data?.data || [];
        setAvailableGuards(rawGuards.filter((g: any) => g.user_id !== user?.id));
        setLogs([]); setPending([]); setInside([]); 
      }
    } catch {}
    setLoading(false);
  }, [activeSocietyId, user?.id, flats.length]);

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load, activeSocietyId]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    if (form.visitor_phone && form.visitor_phone.length === 10) {
      const fetchVisitor = async () => {
        try {
          const res = await api.get(`/visitors/lookup/${form.visitor_phone}`);
          const visitor = res.data?.data;
          if (visitor && !form.visitor_name) {
            setForm((prev: any) => ({ 
              ...prev, 
              visitor_name: visitor.name,
              vehicle_number: visitor.vehicle_number || prev.vehicle_number
            }));
            Toast.show({ type: 'success', text1: 'Visitor Found', text2: `Welcome back, ${visitor.name}!` });
          }
        } catch (e) {}
      };
      fetchVisitor();
    }
  }, [form.visitor_phone]);

  const confirmStartShift = async () => {
    if (!targetGateId) {
      if (Platform.OS === 'web') window.alert('Please select a gate.');
      else Toast.show({ type: 'error', text1: 'Error', text2: 'Please select a gate.' });
      return;
    }
    if (!selectedGuard) {
      if (Platform.OS === 'web') window.alert('Please select your name.');
      else Toast.show({ type: 'error', text1: 'Error', text2: 'Please select your name.' });
      return;
    }
    if (!pinCode || pinCode.length !== 4 || !/^\d{4}$/.test(pinCode)) {
      if (Platform.OS === 'web') window.alert('Please enter a valid 4-digit PIN.');
      else Toast.show({ type: 'error', text1: 'Invalid PIN', text2: 'Please enter a valid 4-digit PIN containing only numbers.' });
      return;
    }
    try {
      const gName = selectedGuard.user?.name || `Guard ${selectedGuard.employee_id}`;
      await GateSessionService.startShift(targetGateId, gName, selectedGuard.id, pinCode.trim());
      setPinModal(false);
      setShowPinInput(false);
      setPinCode('');
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to start gate shift';
      if (Platform.OS === 'web') window.alert(msg);
      else Toast.show({ type: 'error', text1: 'Error', text2: msg });
    }
  };

  const endShift = async () => {
    try {
      await GateSessionService.endShift(session?.guard_id);
      setSelectedGuard(null);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to end gate shift' });
    }
  };

  const markEntry = async (id: string) => {
    try {
      await VisitorLogService.confirmEntry(id, {});
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to confirm entry' });
    }
  };

  const markExit = async (id: string) => {
    try {
      await VisitorLogService.confirmExit(id);
      setVisitorSubTab('all');
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to confirm exit' });
    }
  };

  const registerVisitor = async () => {
    if (!form.visitor_name || !form.visitor_phone || (!form.flat_id && (!form.flat_ids || form.flat_ids.length === 0))) {
      return Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter visitor name, phone, and select flat.' });
    }
    if (form.visitor_phone.length !== 10) {
      return Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid 10-digit mobile number.' });
    }
    if (!form.photo_base64) {
      return Toast.show({ type: 'error', text1: 'Photo Required', text2: 'Please capture a fresh selfie of the visitor.' });
    }
    try {
      await VisitorLogService.create({
        ...form,
        flat_ids: form.flat_ids || (form.flat_id ? [form.flat_id] : []),
        entry_gate_id: session?.gate_id || gates[0]?.id,
      });
      Toast.show({ type: 'error', text1: 'Visitor Logged', text2: 'Resident notified! Awaiting confirmation.' });
      setForm({ entry_mode: 'foot', stay_duration: '1_2hr', purpose: 'Guest' });
      setCurrentTab('dashboard');
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Registration failed' });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission Needed', text2: 'Camera permission is required to take visitor photos.' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
      cameraType: ImagePicker.CameraType.back,
    });

    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, photo_base64: result.assets[0].base64, photo_uri: result.assets[0].uri });
    }
  };

  if (loading) return <LoadingScreen message="Loading guard station..." />;

  const getFlatColor = (flatNumber: string) => {
    if (flatNumber.endsWith('A')) return '#0284C7';
    if (flatNumber.endsWith('B')) return '#10B981';
    return Warm.text;
  };

  const renderContent = () => {
    if (currentTab === 'dashboard') {
      return (
        <View>
          {/* Shift Banner */}
          {!session ? (
            <View>
              <View style={{
                backgroundColor: Warm.amberDim,
                borderColor: Warm.amber + '44',
                borderWidth: 1,
                padding: 32,
                borderRadius: 18,
                marginBottom: 18,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🛡️</Text>
                <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>
                  Terminal Standby
                </Text>
                <Text style={{ color: '#92400E', fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
                  No active shift is currently recorded on this terminal.
                </Text>
                <Btn full variant="amber" onClick={() => setPinModal(true)} style={{ paddingVertical: 14 }}>
                  START SHIFT
                </Btn>
              </View>

              <TouchableOpacity
                onPress={logout}
                style={{
                  backgroundColor: Warm.redDim,
                  borderColor: Warm.red + '44',
                  borderWidth: 1,
                  padding: 20,
                  borderRadius: 18,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                <Text style={{ fontSize: 20 }}>🚪</Text>
                <Text style={{ color: Warm.red, fontWeight: '800', fontSize: 18 }}>LOG OUT</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={{
              backgroundColor: Warm.greenDim,
              borderColor: Warm.green + '44',
              borderWidth: 1,
              borderRadius: 18,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View>
                <Text style={{ color: Warm.green, fontWeight: '800', fontSize: 14 }}>
                  🟢 ON DUTY · {session.guard_name || 'Guard'} ({session.gate?.name || 'Gate'})
                </Text>
                <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 2 }}>
                  Shift started at {formatTimestamp(session.shift_start)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={endShift}
                style={{
                  backgroundColor: Warm.redDim,
                  borderColor: Warm.red + '44',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: Warm.red, fontWeight: '800', fontSize: 12 }}>End Shift</Text>
              </TouchableOpacity>
            </View>

          {/* Quick Metrics */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <View style={{
              flex: 1,
              backgroundColor: Warm.cardBg,
              borderColor: pending.length === 0 ? Warm.cardBorder : pending.length > 3 ? Warm.red : Warm.amber,
              borderWidth: 1.5,
              borderRadius: 18,
              padding: 16,
              ...Warm.shadow,
            }}>
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Awaiting Approval</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: pending.length === 0 ? Warm.text : pending.length > 3 ? Warm.red : Warm.amber, marginTop: 4 }}>
                {pending.length}
              </Text>
            </View>

            <TouchableOpacity 
              disabled={inside.length === 0}
              onPress={() => { setCurrentTab('inside'); setVisitorSubTab('inside'); }}
              style={{
                flex: 1,
                backgroundColor: Warm.cardBg,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 18,
                padding: 16,
                ...Warm.shadow,
              }}
            >
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Inside Society</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: Warm.green, marginTop: 4 }}>
                {inside.length}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            onPress={() => setCurrentTab('register')}
            style={{
              backgroundColor: Warm.accent,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: 20,
              shadowColor: Warm.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>
              + Log Walk-in Visitor
            </Text>
          </TouchableOpacity>

          {/* Pending Approvals */}
          {pending.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309', marginBottom: 10, letterSpacing: 0.5 }}>
                ⏳ AWAITING RESIDENT DECISION ({pending.length})
              </Text>
              {pending.map((log: any) => (
                <View
                  key={log.id}
                  style={{
                    backgroundColor: Warm.cardBg,
                    borderColor: Warm.amber,
                    borderWidth: 1.5,
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 10,
                    ...Warm.shadow,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar name={log.visitor?.name || 'V'} color={Warm.amber} size={48} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                      <Text style={{ color: Warm.accent, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                        Flat {log.flat?.flat_number} · {log.purpose}
                        {log.expected_exit_by ? ` · Exit by: ${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 1 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? ` · 🚗 ${log.vehicle_number}` : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ color: Warm.textDim, fontSize: 11 }}>
                          Logged: {formatTimestamp(log.created_at)}
                        </Text>
                      </View>
                    </View>
                    {log.approval_status === 'approved' && (
                      <TouchableOpacity
                        onPress={() => markEntry(log.id)}
                        style={{
                          backgroundColor: Warm.green,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>✓ Entry</Text>
                      </TouchableOpacity>
                    )}
                    {(() => {
                      if (log.approval_status !== 'pending') return null;
                      if (!log.flat?.allow_guard_force_entry) return null;
                      
                      const elapsed = Math.max(0, Math.floor((now - new Date(log.created_at + 'Z').getTime()) / 1000));
                      
                      if (elapsed > 60) {
                        return (
                          <TouchableOpacity
                            onPress={() => setForceAllowModal(log.id)}
                            style={{
                              backgroundColor: Warm.red,
                              borderRadius: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>⚠ Force Allow</Text>
                          </TouchableOpacity>
                        );
                      } else {
                        const remaining = 60 - elapsed;
                        return (
                          <View style={{ backgroundColor: '#Fef3c7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' }}>
                            <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 12 }}>
                              ⏳ 0:{remaining.toString().padStart(2, '0')}
                            </Text>
                          </View>
                        );
                      }
                    })()}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recent Gate Activity */}
          <Text style={{ fontSize: 15, fontWeight: '800', color: Warm.text, marginBottom: 12 }}>
            Recent Gate Log
          </Text>
          {(!logs || logs.length === 0) ? (
            <View style={{ padding: 24, alignItems: 'center', opacity: 0.8, backgroundColor: Warm.cardBg, borderRadius: 16, borderWidth: 1, borderColor: Warm.cardBorder, ...Warm.shadow }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
              <Text style={{ color: Warm.textMuted, fontSize: 14, fontWeight: '600' }}>No visitors logged yet.</Text>
            </View>
          ) : logs.slice(0, 3).map((log: any) => {
            const derivedState = log.status === 'expected' && log.approval_status ? log.approval_status : log.status;
            const isInside = log.status === 'inside' || log.status === 'overdue';
            const isApproved = derivedState === 'approved' && !isInside && log.status !== 'exited' && log.status !== 'cancelled';
            
            let cardBg = Warm.cardBg;
            let cardBorder = Warm.cardBorder;
            let tagBg = Warm.cardSubtle;
            let tagFg = Warm.textMuted;
            
            switch(derivedState) {
              case 'pending': cardBg = '#FEF3C7'; cardBorder = '#FDE68A'; tagBg = '#FDE68A'; tagFg = '#92400E'; break;
              case 'approved': cardBg = '#E0F2FE'; cardBorder = '#BAE6FD'; tagBg = '#BAE6FD'; tagFg = '#0369A1'; break;
              case 'denied': cardBg = '#FFE4E6'; cardBorder = '#FECDD3'; tagBg = '#FECDD3'; tagFg = '#E11D48'; break;
              case 'inside': cardBg = '#D1FAE5'; cardBorder = '#A7F3D0'; tagBg = '#A7F3D0'; tagFg = '#059669'; break;
              case 'overdue': cardBg = '#FEE2E2'; cardBorder = '#FCA5A5'; tagBg = '#FCA5A5'; tagFg = '#DC2626'; break;
              case 'exited': cardBg = '#F3F4F6'; cardBorder = '#E5E7EB'; tagBg = '#E5E7EB'; tagFg = '#4B5563'; break;
              case 'unconfirmed_exit': cardBg = '#FFEDD5'; cardBorder = '#FDBA74'; tagBg = '#FDBA74'; tagFg = '#C2410C'; break;
              case 'cancelled': cardBg = '#F3F4F6'; cardBorder = '#D1D5DB'; tagBg = '#D1D5DB'; tagFg = '#374151'; break;
              default: break;
            }
            
            const purposeIcon = log.purpose === 'Delivery' ? '🚚' : log.purpose === 'Cab' ? '🚕' : log.purpose === 'Service' ? '🛠️' : '👥';
            const vehicleIcon = log.entry_mode === 'two_wheeler' ? '🛵' : '🚗';
            const vehicleText = log.vehicle_number ? ` · ${vehicleIcon} ${log.vehicle_number}` : log.entry_mode === 'foot' ? ' · 🚶 On Foot' : ` · ${vehicleIcon} ${log.entry_mode === 'two_wheeler' ? 'Two Wheeler' : 'Four Wheeler'}`;

            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Avatar name={log.visitor?.name || 'V'} size={40} color={tagFg} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 16 }}>{log.visitor?.name}</Text>
                        <Text style={{ fontSize: 14 }}>{purposeIcon}</Text>
                      </View>
                      <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 2, fontWeight: '500' }}>
                        Flat {log.flat?.flat_number} · {log.purpose}{vehicleText}
                      </Text>
                      {log.expected_exit_by && !log.actual_exit_at && (
                        <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 2 }}>
                          Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={{ backgroundColor: tagBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
                    <Text style={{ color: tagFg, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                      {derivedState.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {isInside && (
                  <TouchableOpacity
                    onPress={() => markExit(log.id)}
                    style={{ backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }}>Mark Exit</Text>
                  </TouchableOpacity>
                )}
                
                {isApproved && (
                  <TouchableOpacity
                    onPress={() => markEntry(log.id)}
                    style={{ backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }}>Allow Entry</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  style={{ 
                    marginTop: 12, borderWidth: 1, borderColor: '#1F2937' + '22', borderRadius: 12, 
                    paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#1F2937', fontSize: 13, fontWeight: '800' }}>
                    {expandedLogId === log.id ? 'View Detailed History ˄' : 'HISTORY LOG ˅'}
                  </Text>
                </TouchableOpacity>

                {expandedLogId === log.id && (
                  <View style={{ paddingTop: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: '#4B5563' }}>• 📝 <Text style={{ fontWeight: '700', color: '#1F2937' }}>Created</Text> by {log.approval_source === 'self_checkin' ? 'Visitor (Self)' : (log.guard_name || 'Guard')} at {formatTimestamp(log.created_at)}</Text>
                    </View>
                    {log.approved_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#4B5563' }}>• {log.approval_status === 'approved' ? '✅' : '❌'} <Text style={{ fontWeight: '700', color: '#1F2937' }}>{log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text> by {log.approver_name || 'Resident'} at {formatTimestamp(log.approved_at)}</Text>
                      </View>
                    )}
                    {log.entered_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#4B5563' }}>• ✅ <Text style={{ fontWeight: '700', color: '#1F2937' }}>Allowed Entry</Text> at {formatTimestamp(log.entered_at)} (Marked by Guard)</Text>
                      </View>
                    )}
                    {log.actual_exit_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#4B5563' }}>• 🚪 <Text style={{ fontWeight: '700', color: '#1F2937' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)} {log.exit_confirmed_by ? `(Marked by ${log.exit_confirmed_by})` : ''}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          </>
          )}
        </View>
      );
    }

    if (currentTab === 'register') {
      return (
        <View>
          <View style={{
            backgroundColor: Warm.cardBg,
            borderColor: Warm.cardBorder,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            ...Warm.shadow,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text, marginBottom: 14 }}>
              Register Walk-in Visitor
            </Text>
            <Input
              label="Phone Number *"
              placeholder="10-digit mobile number"
              maxLength={10}
              keyboardType="number-pad"
              value={form.visitor_phone || ''}
              onChange={(v: string) => setForm({ ...form, visitor_phone: v.replace(/[^0-9]/g, '') })}
              icon="📞"
            />

            {form.visitor_phone && form.visitor_phone.length === 10 && (
              <>
                {!form.photo_uri ? (
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderColor: '#CBD5E1',
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderRadius: 14,
                      padding: 16,
                      alignItems: 'center',
                      marginVertical: 12,
                    }}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>📷</Text>
                    <Text style={{ color: Warm.textMuted, fontWeight: '600' }}>Tap to Take Photo</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ alignItems: 'center', marginVertical: 12 }}>
                    <Image source={{ uri: form.photo_uri }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: Warm.accent }} />
                    <Text style={{ color: Warm.green, fontWeight: '700', marginTop: 8 }}>✓ Photo Captured</Text>
                    <TouchableOpacity onPress={() => setForm({ ...form, photo_base64: null, photo_uri: null })}>
                      <Text style={{ color: Warm.red, fontSize: 12, marginTop: 4, fontWeight: '700' }}>Retake Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {form.photo_uri && (
                  <>
                    <Input
                      label="Visitor Full Name *"
                      placeholder="e.g. Ramesh Kumar"
                      value={form.visitor_name || ''}
                      onChange={(v: string) => setForm({ ...form, visitor_name: v })}
                      icon="👤"
                    />
                    <MultiSearchableSelect
                      label="Flats to Visit *"
                      value={form.flat_ids || []}
                      onChange={(v: string[]) => setForm({ ...form, flat_ids: v })}
                      options={flats.map((f: any) => ({
                        value: f.id.toString(),
                        label: `Flat ${f.flat_number}`,
                        color: getFlatColor(f.flat_number),
                      }))}
                      placeholder="Select destination flats..."
                    />
                    <Select
                      label="Purpose of Entry"
                      value={form.purpose || 'Guest'}
                      onChange={(v: string) => setForm({ ...form, purpose: v })}
                      options={[
                        { value: 'Guest', label: 'Guest / Family' },
                        { value: 'Delivery', label: 'Delivery' },
                        { value: 'Cab', label: 'Cab Pickup / Drop' },
                        { value: 'Service', label: 'Maintenance / Daily Help' },
                        { value: 'Other', label: 'Other' },
                      ]}
                    />
                    <Select
              label="Mode of Entry"
              value={form.entry_mode || 'foot'}
              onChange={(v: string) => setForm({ ...form, entry_mode: v })}
              options={[
                { value: 'foot', label: 'On Foot' },
                { value: 'two_wheeler', label: 'Two Wheeler (Bike/Scooter)' },
                { value: 'four_wheeler', label: 'Four Wheeler (Car/Cab)' },
              ]}
            />
            {form.entry_mode !== 'foot' && (
              <Input
                label="Vehicle Number"
                placeholder="e.g. DL 01 AB 1234"
                value={form.vehicle_number || ''}
                onChange={(v: string) => setForm({ ...form, vehicle_number: v })}
                icon="🚗"
                autoCapitalize="characters"
              />
            )}

            <TouchableOpacity
              onPress={registerVisitor}
              style={{
                backgroundColor: Warm.accent,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                Notify Resident & Log Entry →
              </Text>
            </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      );
    }

    if (currentTab === 'inside') {
      const displayLogs = visitorSubTab === 'inside' ? inside : logs;

      return (
        <View>
          <View style={{ flexDirection: 'row', backgroundColor: Warm.cardBorder, borderRadius: 12, padding: 4, marginBottom: 16 }}>
            <TouchableOpacity 
              onPress={() => setVisitorSubTab('inside')} 
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: visitorSubTab === 'inside' ? Warm.cardBg : 'transparent', alignItems: 'center', ...(visitorSubTab === 'inside' ? Warm.shadow : {}) }}
            >
              <Text style={{ fontWeight: '800', color: visitorSubTab === 'inside' ? Warm.text : Warm.textMuted }}>Inside ({inside.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setVisitorSubTab('all')} 
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: visitorSubTab === 'all' ? Warm.cardBg : 'transparent', alignItems: 'center', ...(visitorSubTab === 'all' ? Warm.shadow : {}) }}
            >
              <Text style={{ fontWeight: '800', color: visitorSubTab === 'all' ? Warm.text : Warm.textMuted }}>All Today ({logs.length})</Text>
            </TouchableOpacity>
          </View>

          {displayLogs.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 20, padding: 32, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 36 }}>{visitorSubTab === 'inside' ? '🏘️' : '📋'}</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', fontSize: 16, marginTop: 8 }}>
                {visitorSubTab === 'inside' ? 'No Visitors Currently Inside' : 'No Visitors Logged Today'}
              </Text>
              <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2, textAlign: 'center' }}>
                {visitorSubTab === 'inside' ? 'Logged visitors will appear here until they exit.' : 'New visitors registered at the gate will appear here.'}
              </Text>
            </View>
          )}

          {displayLogs.map((log: any) => {
            const derivedState = log.status === 'expected' && log.approval_status ? log.approval_status : log.status;
            const isInside = log.status === 'inside' || log.status === 'overdue';
            const isApproved = derivedState === 'approved' && !isInside && log.status !== 'exited' && log.status !== 'cancelled';
            
            let cardBg = Warm.cardBg;
            let cardBorder = Warm.cardBorder;
            let tagBg = Warm.cardSubtle;
            let tagFg = Warm.textMuted;
            
            switch(derivedState) {
              case 'pending': cardBg = '#FEF3C7'; cardBorder = '#FDE68A'; tagBg = '#FDE68A'; tagFg = '#92400E'; break;
              case 'approved': cardBg = '#E0F2FE'; cardBorder = '#BAE6FD'; tagBg = '#BAE6FD'; tagFg = '#0369A1'; break;
              case 'denied': cardBg = '#FFE4E6'; cardBorder = '#FECDD3'; tagBg = '#FECDD3'; tagFg = '#E11D48'; break;
              case 'inside': cardBg = '#D1FAE5'; cardBorder = '#A7F3D0'; tagBg = '#A7F3D0'; tagFg = '#059669'; break;
              case 'overdue': cardBg = '#FEE2E2'; cardBorder = '#FCA5A5'; tagBg = '#FCA5A5'; tagFg = '#DC2626'; break;
              case 'exited': cardBg = '#F3F4F6'; cardBorder = '#E5E7EB'; tagBg = '#E5E7EB'; tagFg = '#4B5563'; break;
              case 'unconfirmed_exit': cardBg = '#FFEDD5'; cardBorder = '#FDBA74'; tagBg = '#FDBA74'; tagFg = '#C2410C'; break;
              case 'cancelled': cardBg = '#F3F4F6'; cardBorder = '#D1D5DB'; tagBg = '#D1D5DB'; tagFg = '#374151'; break;
              default: break;
            }
            
            const purposeIcon = log.purpose === 'Delivery' ? '🚚' : log.purpose === 'Cab' ? '🚕' : log.purpose === 'Service' ? '🛠️' : '👥';
            const vehicleIcon = log.entry_mode === 'two_wheeler' ? '🛵' : '🚗';
            const vehicleText = log.vehicle_number ? ` · ${vehicleIcon} ${log.vehicle_number}` : log.entry_mode === 'foot' ? ' · 🚶 On Foot' : ` · ${vehicleIcon} ${log.entry_mode === 'two_wheeler' ? 'Two Wheeler' : 'Four Wheeler'}`;

            return (
              <View
                key={log.id}
                style={{
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Avatar name={log.visitor?.name || 'V'} size={40} color={tagFg} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontWeight: '800', color: '#1F2937', fontSize: 16 }}>{log.visitor?.name}</Text>
                        <Text style={{ fontSize: 14 }}>{purposeIcon}</Text>
                      </View>
                      <Text style={{ color: '#4B5563', fontSize: 12, marginTop: 2, fontWeight: '500' }}>
                        Flat {log.flat?.flat_number} · {log.purpose}{vehicleText}
                      </Text>
                      {log.expected_exit_by && !log.actual_exit_at && (
                        <Text style={{ color: '#4B5563', fontSize: 11, marginTop: 2 }}>
                          Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={{ backgroundColor: tagBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 }}>
                    <Text style={{ color: tagFg, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                      {derivedState.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {isInside && (
                  <TouchableOpacity
                    onPress={() => markExit(log.id)}
                    style={{ backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }}>Mark Exit</Text>
                  </TouchableOpacity>
                )}
                
                {isApproved && (
                  <TouchableOpacity
                    onPress={() => markEntry(log.id)}
                    style={{ backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' }}>Allow Entry</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  style={{ 
                    marginTop: 12, borderWidth: 1, borderColor: '#1F2937' + '22', borderRadius: 12, 
                    paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center'
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#1F2937', fontSize: 13, fontWeight: '800' }}>
                    {expandedLogId === log.id ? 'View Detailed History ˄' : 'HISTORY LOG ˅'}
                  </Text>
                </TouchableOpacity>

                {expandedLogId === log.id && (
                  <View style={{ paddingTop: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, color: '#4B5563' }}>• 📝 <Text style={{ fontWeight: '700', color: '#1F2937' }}>Created</Text> by {log.approval_source === 'self_checkin' ? 'Visitor (Self)' : (log.guard_name || 'Guard')} at {formatTimestamp(log.created_at)}</Text>
                    </View>
                    {log.approved_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#4B5563' }}>• {log.approval_status === 'approved' ? '✅' : '❌'} <Text style={{ fontWeight: '700', color: '#1F2937' }}>{log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text> by {log.approver_name || 'Resident'} at {formatTimestamp(log.approved_at)}</Text>
                      </View>
                    )}
                    {log.entered_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#4B5563' }}>• ✅ <Text style={{ fontWeight: '700', color: '#1F2937' }}>Allowed Entry</Text> at {formatTimestamp(log.entered_at)} (Marked by Guard)</Text>
                      </View>
                    )}
                    {log.actual_exit_at && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#4B5563' }}>• 🚪 <Text style={{ fontWeight: '700', color: '#1F2937' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)} {log.exit_confirmed_by ? `(Marked by ${log.exit_confirmed_by})` : ''}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    if (currentTab === 'qr') {
      const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://vmsrm2.netlify.app';
      const actualGateId = session?.gate_id || selectedQrGateId;
      const actualGateName = session?.gate?.name || (gates.find(g => g.id === actualGateId)?.name) || 'Gate';

      if (!actualGateId) {
        return (
          <View style={{ padding: 20 }}>
            <View style={{
              backgroundColor: Warm.amberDim,
              borderColor: Warm.amber + '44',
              borderWidth: 1,
              padding: 16,
              borderRadius: 18,
              marginBottom: 18,
            }}>
              <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 15, marginBottom: 12, textAlign: 'center' }}>
                ⚠️ Select Gate for QR Check-in
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {gates.map((g: any) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setSelectedQrGateId(g.id)}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      backgroundColor: '#FFFFFF',
                      borderColor: Warm.amber,
                      borderWidth: 1.5,
                      borderRadius: 16,
                      padding: 16,
                      alignItems: 'center',
                      ...Warm.shadow,
                    }}
                  >
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>{g.type === 'exit' ? '🚪' : '⛩️'}</Text>
                    <Text style={{ color: Warm.text, fontWeight: '800', fontSize: 14, textAlign: 'center' }}>{g.name}</Text>
                    <Text style={{ color: Warm.amber, fontWeight: '800', fontSize: 11, marginTop: 6, textTransform: 'uppercase' }}>Generate QR</Text>
                  </TouchableOpacity>
                ))}
                {gates.length === 0 && (
                  <Text style={{ color: '#B45309', fontSize: 13, textAlign: 'center', marginVertical: 10 }}>
                    No gates found for this society. Contact admin.
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      }

      const qrUrl = `${baseUrl}?society_id=${activeSocietyId}&gate_id=${actualGateId}`;
      
      return (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: Warm.cardBg,
            borderColor: Warm.cardBorder,
            borderWidth: 1,
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            width: '100%',
            ...Warm.shadow,
          }}>
            {!session?.gate_id && (
              <TouchableOpacity 
                onPress={() => setSelectedQrGateId(null)}
                style={{ alignSelf: 'flex-start', marginBottom: 16 }}
              >
                <Text style={{ color: Warm.amber, fontWeight: '700' }}>← Change Gate</Text>
              </TouchableOpacity>
            )}

            <Text style={{ fontSize: 20, fontWeight: '800', color: Warm.text, marginBottom: 6, textAlign: 'center' }}>
              Self Check-In QR
            </Text>
            <Text style={{ color: Warm.text, fontWeight: '800', fontSize: 14, marginBottom: 6 }}>
              {actualGateName}
            </Text>
            <Text style={{ color: Warm.textMuted, marginBottom: 24, textAlign: 'center', fontSize: 13 }}>
              Visitors can scan this QR code on their phone to complete quick check-in.
            </Text>
            <View style={{ padding: 18, backgroundColor: '#FFFFFF', borderRadius: 16, borderColor: '#E5DFD7', borderWidth: 1 }}>
              <QRCode value={qrUrl} size={220} color="#1E293B" backgroundColor="#FFFFFF" />
            </View>
            <Text style={{ color: Warm.textDim, marginTop: 16, fontSize: 11 }}>
              Points to: {qrUrl}
            </Text>
          </View>
        </View>
      );
    }

    if (currentTab === 'profile') {
      return (
        <View>
          <View style={{
            backgroundColor: Warm.cardBg,
            borderColor: Warm.cardBorder,
            borderWidth: 1,
            borderRadius: 24,
            padding: 30,
            alignItems: 'center',
            ...Warm.shadow,
          }}>
            <Avatar name={user?.name || '?'} size={80} color={Warm.accent} />
            <Text style={{ color: Warm.text, fontSize: 22, fontWeight: '800', marginTop: 14 }}>{user?.name}</Text>
            <Text style={{ color: Warm.textMuted, fontSize: 15, marginTop: 2 }}>{user?.phone}</Text>
            <View style={{ backgroundColor: Warm.accentDim, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 }}>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 11 }}>SECURITY GUARD</Text>
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
            <Text style={{ color: Warm.red, fontWeight: '800', fontSize: 15 }}>Log Out of Guard Terminal</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Warm.bg }}>
      {/* ── Top Guard Station Header ── */}
      <View style={{
        backgroundColor: Warm.headerBg,
        paddingTop: Math.max(insets.top, 24) + 8,
        paddingBottom: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Warm.headerBorder,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SocietySwitcher theme="warm" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: session ? Warm.greenDim : Warm.amberDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
              <Text style={{ color: session ? Warm.green : '#B45309', fontWeight: '800', fontSize: 11 }}>
                {session ? `🛡️ ${session.gate?.name || 'Gate Active'}` : '⚠️ Off Duty'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Main Scroll Area ── */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 18, paddingTop: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Warm.accent} />}
      >
        <Animated.View {...panResponder.panHandlers} style={{ minHeight: Dimensions.get('window').height - 230, transform: [{ translateX: slideAnim }], paddingBottom: 85 + Math.max(insets.bottom, 16) }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* ── Guard Bottom Navigation Bar ── */}
      {session && (
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
            { id: 'inside', label: 'Visitors', icon: '👥' },
            { id: 'qr', label: 'QR Checkin', icon: '📱' },
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
      )}
      {/* ── Shift Start Modal ── */}
      {pinModal && (
        <Modal 
          title="Start Shift" 
          subtitle="Select your profile and gate to take over." 
          onClose={() => { setPinModal(false); setPinCode(''); setSelectedGuard(null); setTargetGateId(''); }}
        >
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: Warm.textMuted, textTransform: 'uppercase', marginBottom: 8, fontWeight: '600' }}>1. Select Gate</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {gates.map((g: any) => {
                const isSelected = String(targetGateId) === String(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setTargetGateId(g.id)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: isSelected ? Warm.accent : Warm.cardSubtle,
                      borderColor: isSelected ? Warm.accent : Warm.cardBorder,
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{
                      color: isSelected ? '#FFFFFF' : Warm.text,
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: 14,
                    }}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: Warm.textMuted, textTransform: 'uppercase', marginBottom: 8, fontWeight: '600' }}>2. Select Guard</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {availableGuards.map((g: any) => {
                const isSelected = String(selectedGuard?.id) === String(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      if (!targetGateId) {
                        if (Platform.OS === 'web') window.alert('Please select a gate first.');
                        else Toast.show({ type: 'error', text1: 'Error', text2: 'Please select a gate first.' });
                        return;
                      }
                      setSelectedGuard(g);
                      setShowPinInput(true);
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: isSelected ? Warm.accent : Warm.cardSubtle,
                      borderColor: isSelected ? Warm.accent : Warm.cardBorder,
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{
                      color: isSelected ? '#FFFFFF' : Warm.text,
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: 14,
                    }}>
                      {g.user?.name || `Guard ${g.employee_id}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PIN Input and Verify button are moved to a secondary modal */}
        </Modal>
      )}

      {/* ── PIN Input Modal ── */}
      {showPinInput && (
        <Modal 
          title="Enter Your PIN" 
          subtitle={`To start shift as ${selectedGuard?.user?.name || 'Guard'}`}
          onClose={() => { setShowPinInput(false); setPinCode(''); setSelectedGuard(null); }}
        >
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 30 }}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: pinCode.length > i ? Warm.accent : Warm.cardBorder }} />
              ))}
            </View>

            <View style={{ width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'].map(key => {
                const isAction = key === 'DEL' || key === 'OK';
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      if (key === 'DEL') {
                        setPinCode(prev => prev.slice(0, -1));
                      } else if (key === 'OK') {
                        confirmStartShift();
                      } else {
                        if (pinCode.length < 4) setPinCode(prev => prev + key);
                      }
                    }}
                    style={{
                      width: '30%',
                      aspectRatio: 1.8,
                      backgroundColor: key === 'OK' ? Warm.green : isAction ? Warm.cardSubtle : Warm.cardBg,
                      borderColor: Warm.cardBorder,
                      borderWidth: 1,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 12,
                      ...Warm.shadow,
                    }}
                  >
                    <Text style={{ fontSize: isAction ? 14 : 24, fontWeight: '800', color: key === 'OK' ? '#FFFFFF' : Warm.text }}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Modal>
      )}

      {forceAllowModal && (
        <Modal 
          title="Force Allow Entry" 
          subtitle="Please provide a reason for forcing this entry without resident approval."
          onClose={() => { setForceAllowModal(null); setForceAllowReason(''); }}
        >
          <Input 
            placeholder="e.g., Delivery wait time exceeded"
            value={forceAllowReason}
            onChange={(v: string) => setForceAllowReason(v)}
          />
          <Btn
            variant="red"
            style={{ marginTop: 16 }}
            onClick={async () => {
              if (!forceAllowReason.trim()) {
                if (Platform.OS === 'web') window.alert('Reason is required');
                else Toast.show({ type: 'error', text1: 'Error', text2: 'Reason is required' });
                return;
              }
              try {
                await VisitorLogService.forceApprove(forceAllowModal, forceAllowReason.trim());
                Toast.show({ type: 'success', text1: 'Success', text2: 'Force entry approved' });
                setForceAllowModal(null);
                setForceAllowReason('');
                load();
              } catch (e: any) {
                Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed' });
              }
            }}
          >
            Confirm Force Allow
          </Btn>
        </Modal>
      )}

    </View>
  );
}
