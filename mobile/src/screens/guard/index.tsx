import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, ScrollView, BackHandler, PanResponder, Dimensions, Animated, TouchableOpacity, RefreshControl, TextInput, Platform, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { VisitorLogService, GateSessionService, GateService, FlatService, PreApprovalService, GuardService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, SearchableSelect, StatCard, EmptyState, LoadingScreen, SocietySwitcher, Modal } from '../../components/UI';
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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQrGateId, setSelectedQrGateId] = useState<number | null>(null);
  
  // Fast Passcode Lookup
  const [passcode, setPasscode] = useState('');
  const [verifyingPass, setVerifyingPass] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<any>(null);
  const [pinModal, setPinModal] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [targetGateId, setTargetGateId] = useState('');
  const [availableGuards, setAvailableGuards] = useState<any[]>([]);

  const [form, setForm] = useState<any>({ entry_mode: 'foot', stay_duration: '1_2hr', purpose: 'Guest' });

  const load = useCallback(async () => {
    try {
      // 1. Fetch Session & Metadata needed for Shift Start
      const [sr, gr, guardRes] = await Promise.all([
        GateSessionService.getActive().catch(() => ({ data: { data: [] } })),
        GateService.getAll().catch(() => ({ data: { data: [] } })),
        GuardService.getAll({ per_page: 50 }).catch(() => ({ data: { data: [] } })),
      ]);
      
      const sessions = sr.data?.data || [];
      const activeSession = sessions.find((s: any) => !s.shift_end) || null;
      setSession(activeSession);
      const fetchedGates = gr.data?.data?.items || gr.data?.data || [];
      setGates(fetchedGates);
      if (fetchedGates.length === 1) {
        setTargetGateId(fetchedGates[0].id);
      }
      const rawGuards = guardRes.data?.data?.items || guardRes.data?.data || [];
      console.log('DEBUG: rawGuards', rawGuards, 'gates', fetchedGates); setAvailableGuards(rawGuards.filter((g: any) => g.user_id !== user?.id));

      // 2. ONLY if shift is active, fetch Heavy Data
      if (activeSession) {
        const [lr, pr, ir, fr] = await Promise.all([
          VisitorLogService.getLogs().catch(() => ({ data: { data: [] } })),
          VisitorLogService.getPending().catch(() => ({ data: { data: [] } })),
          VisitorLogService.getInside().catch(() => ({ data: { data: [] } })),
          FlatService.getAll({ per_page: 5000, society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        ]);
        setLogs(lr.data?.data?.items || lr.data?.data || []);
        setPending(pr.data?.data || []);
        setInside(ir.data?.data || []);
        const rawFlats = fr.data?.data?.items || fr.data?.data || [];
        rawFlats.sort((a: any, b: any) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true, sensitivity: 'base' }));
        setFlats(rawFlats);
      } else {
        setLogs([]); setPending([]); setInside([]); setFlats([]);
      }
    } catch {}
    setLoading(false);
  }, [activeSocietyId, user?.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [load, activeSocietyId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to confirm exit' });
    }
  };

  const registerVisitor = async () => {
    if (!form.visitor_name || !form.visitor_phone || !form.flat_id) {
      return Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter visitor name, phone, and select flat.' });
    }
    if (form.visitor_phone.length !== 10) {
      return Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid 10-digit mobile number.' });
    }
    try {
      await VisitorLogService.create({
        ...form,
        flat_id: parseInt(form.flat_id),
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
    });

    if (!result.canceled && result.assets[0].base64) {
      setForm({ ...form, photo_base64: result.assets[0].base64, photo_uri: result.assets[0].uri });
    }
  };

  const verifyPasscodeLookup = async () => {
    if (!passcode || passcode.trim().length < 4) {
      return Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter the 4 to 6-digit visitor pass code.' });
    }
    setVerifyingPass(true);
    try {
      // Find matching active pre-approval or verify
      const res = await PreApprovalService.verifyPasscode(passcode.trim()).catch(() => null);
      if (res?.data?.data) {
        Toast.show({ type: 'success', text1: 'Pass Verified ✅', text2: `Pre-approved entry for ${res.data.data.visitor_name} to Flat ${res.data.data.flat?.flat_number || ''}` });
        setPasscode('');
        load();
      } else {
        Toast.show({ type: 'error', text1: 'Passcode Status', text2: `Checked code "${passcode.trim()}". If valid, resident pre-clearance recorded.` });
        setPasscode('');
        load();
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Verification Failed', text2: err.response?.data?.message || 'Passcode not found or expired.' });
    } finally {
      setVerifyingPass(false);
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

          {/* Quick Passcode Validator (Top Priority for Guard) */}
          <View style={{
            backgroundColor: Warm.cardBg,
            borderColor: Warm.cardBorder,
            borderWidth: 1,
            borderRadius: 20,
            padding: 16,
            marginBottom: 18,
            ...Warm.shadow,
          }}>
            <Text style={{ fontSize: 11, color: Warm.textMuted, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 }}>
              🎫 Fast Visitor Passcode Verification
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', paddingHorizontal: 14, height: 48, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
                <Text style={{ fontSize: 16, marginRight: 10, opacity: 0.6 }}>🔢</Text>
                <TextInput
                  placeholder="Enter 6-Digit Passcode (e.g. 482910)"
                  placeholderTextColor="#94A3B8"
                  value={passcode}
                  onChangeText={setPasscode}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ flex: 1, color: '#1E293B', fontSize: 15, fontWeight: '600', height: 48 }}
                />
              </View>
              <TouchableOpacity
                onPress={verifyPasscodeLookup}
                disabled={verifyingPass}
                style={{
                  backgroundColor: Warm.accent,
                  borderRadius: 12,
                  paddingHorizontal: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 48,
                  marginTop: 0,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  {verifyingPass ? '...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
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

            <View style={{
              flex: 1,
              backgroundColor: Warm.cardBg,
              borderColor: Warm.cardBorder,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              ...Warm.shadow,
            }}>
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Inside Society</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: Warm.green, marginTop: 4 }}>
                {inside.length}
              </Text>
            </View>
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
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 1 }}>
                        📞 {log.visitor?.phone}
                      </Text>
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
          ) : logs.slice(0, 8).map((log: any) => {
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
                    Flat {log.flat?.flat_number} · {log.purpose}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: tagBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ color: tagFg, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                      {log.status || log.approval_status}
                    </Text>
                  </View>
                  {(log.status === 'inside' || log.status === 'overdue') && (
                    <TouchableOpacity onPress={() => markExit(log.id)} style={{ marginTop: 6 }}>
                      <Text style={{ color: Warm.accent, fontSize: 12, fontWeight: '700' }}>Depart ➔</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
              label="Visitor Full Name *"
              placeholder="e.g. Ramesh Kumar"
              value={form.visitor_name || ''}
              onChange={(v: string) => setForm({ ...form, visitor_name: v })}
              icon="👤"
            />
            <Input
              label="Phone Number *"
              placeholder="98765 43210"
              maxLength={10}
              keyboardType="number-pad"
              value={form.visitor_phone || ''}
              onChange={(v: string) => setForm({ ...form, visitor_phone: v.replace(/[^0-9]/g, '') })}
              icon="📞"
            />
            {form.photo_uri ? (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Image source={{ uri: form.photo_uri }} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: Warm.accent }} />
                <Text style={{ color: Warm.green, fontWeight: '700', marginTop: 8 }}>✓ Photo Captured</Text>
                <TouchableOpacity onPress={() => setForm({ ...form, photo_base64: null, photo_uri: null })}>
                  <Text style={{ color: Warm.red, fontSize: 12, marginTop: 4, fontWeight: '700' }}>Remove Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
                <Text style={{ color: Warm.textMuted, fontWeight: '600' }}>Capture Visitor Photo (Optional)</Text>
              </TouchableOpacity>
            )}
            <SearchableSelect
              label="Flat to Visit *"
              value={form.flat_id || ''}
              onChange={(v: string) => setForm({ ...form, flat_id: v })}
              options={flats.map((f: any) => ({
                value: f.id.toString(),
                label: `Flat ${f.flat_number}`,
                color: getFlatColor(f.flat_number),
              }))}
              placeholder="Select destination flat..."
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
          </View>
        </View>
      );
    }

    if (currentTab === 'inside') {
      return (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text }}>Visitors Inside Society</Text>
            <View style={{ backgroundColor: Warm.greenDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: Warm.green, fontWeight: '800', fontSize: 12 }}>{inside.length} Currently Inside</Text>
            </View>
          </View>

          {inside.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 20, padding: 32, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 36 }}>🏘️</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', fontSize: 16, marginTop: 8 }}>No Visitors Currently Inside</Text>
              <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>Logged visitors will appear here until they exit.</Text>
            </View>
          )}

          {inside.map((log: any) => (
            <View
              key={log.id}
              style={{
                backgroundColor: Warm.cardBg,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 18,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                ...Warm.shadow,
              }}
            >
              <Avatar name={log.visitor?.name || 'V'} size={46} color={log.status === 'overdue' ? Warm.red : Warm.green} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                  Flat {log.flat?.flat_number} · {log.purpose}
                </Text>
                <Text style={{ color: Warm.textDim, fontSize: 11, marginTop: 2 }}>
                  Entered: {formatTimestamp(log.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => markExit(log.id)}
                style={{
                  backgroundColor: log.status === 'overdue' ? Warm.redDim : Warm.greenDim,
                  borderColor: log.status === 'overdue' ? Warm.red + '44' : Warm.green + '44',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: log.status === 'overdue' ? Warm.red : Warm.green, fontWeight: '800', fontSize: 12 }}>
                  Mark Exit ➔
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }

    if (currentTab === 'qr') {
      const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://vmsrm2.netlify.app';

      if (!selectedQrGateId) {
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

      const selectedGate = gates.find(g => g.id === selectedQrGateId);
      const qrUrl = `${baseUrl}?society_id=${activeSocietyId}&gate_id=${selectedQrGateId}`;
      
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
            <TouchableOpacity 
              onPress={() => setSelectedQrGateId(null)}
              style={{ alignSelf: 'flex-start', marginBottom: 16 }}
            >
              <Text style={{ color: Warm.amber, fontWeight: '700' }}>← Change Gate</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 20, fontWeight: '800', color: Warm.text, marginBottom: 6, textAlign: 'center' }}>
              Self Check-In QR
            </Text>
            <Text style={{ color: Warm.text, fontWeight: '800', fontSize: 14, marginBottom: 6 }}>
              {selectedGate?.name || 'Gate'}
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
            { id: 'inside', label: 'Inside', icon: '👥' },
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

    </View>
  );
}
