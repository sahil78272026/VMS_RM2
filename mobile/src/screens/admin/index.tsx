import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, ScrollView, BackHandler, PanResponder, Dimensions, ActivityIndicator, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Card, Btn, StatCard, EmptyState, LoadingScreen, Tabs, Avatar, Badge, Input, Select, Modal, SocietySwitcher } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { UserService, FlatUserService, GuardService, FlatService, MaintenanceService, AmenityService } from '../../services';
import { formatDate } from '../../utils/date';
export { SuperAdminScreen } from './SuperAdminScreen';

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

export function AdminDashboard({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout, activeSociety, activeSocietyId } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const tabOrder = ['dashboard', 'residents', 'maintenance', 'guards', 'services', 'profile'];
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

  const [loading, setLoading] = useState(true);
  const [flats, setFlats] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [pendingResidents, setPendingResidents] = useState<any[]>([]);
  const [activeResidents, setActiveResidents] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [maintenanceFlats, setMaintenanceFlats] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [flatPage, setFlatPage] = useState(1);
  const [flatTotalPages, setFlatTotalPages] = useState(1);
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const isLoadingRef = useRef(false);

  const loadMaintenanceFlats = useCallback(async (page: number, query: string, append = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (page > 1) setLoadingMore(true);
    try {
      const res = await MaintenanceService.getFlats({ page, per_page: 20, query, society_id: activeSocietyId });
      const newItems = res.data?.data?.items || [];
      if (append) {
        setMaintenanceFlats(prev => {
          const existingIds = new Set(prev.map((item: any) => item.id));
          const uniqueNew = newItems.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setMaintenanceFlats(newItems);
      }
      setFlatTotalPages(res.data?.data?.pages || 1);
    } catch {}
    setLoadingMore(false);
    isLoadingRef.current = false;
  }, [activeSocietyId]);

  const load = useCallback(async () => {
    try {
      const [fr, gr, pr, ar, p_pay, srv] = await Promise.all([
        FlatService.getAll({ per_page: 5000, society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        GuardService.getAll({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        UserService.getAll({ role: 'resident', status: 'pending_verification', society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        UserService.getAll({ role: 'resident', status: 'active', society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        MaintenanceService.getPending({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        AmenityService.getAll({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
      ]);
      const frFlats = fr.data?.data?.items || fr.data?.data || [];
      frFlats.sort((a: any, b: any) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true, sensitivity: 'base' }));
      setFlats(frFlats);
      setGuards(gr.data?.data?.items || gr.data?.data || []);
      setPendingResidents(pr.data?.data?.items || pr.data?.data || []);
      setActiveResidents(ar.data?.data?.items || ar.data?.data || []);
      setPendingPayments(p_pay.data?.data || []);
      setServices(srv.data?.data || []);
    } catch {}
    setLoading(false);
  }, [activeSocietyId]);

  useEffect(() => {
    load();
    loadMaintenanceFlats(1, '', false);
    const t = setInterval(load, 25000);
    return () => clearInterval(t);
  }, [load, loadMaintenanceFlats, activeSocietyId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setFlatPage(1);
    await Promise.all([load(), loadMaintenanceFlats(1, searchQuery, false)]);
    setRefreshing(false);
  };

  const onSearchChange = (v: string) => {
    setSearchQuery(v);
    setFlatPage(1);
    loadMaintenanceFlats(1, v, false);
  };

  const approveResident = async (userToApprove: any) => {
    try {
      await FlatUserService.addPrimary({
        user_id: userToApprove.id,
        flat_id: userToApprove.requested_flat_id,
        role: 'primary',
        is_owner: true,
        move_in_date: userToApprove.move_in_date || new Date().toISOString().split('T')[0],
      });
      Toast.show({ type: 'success', text1: 'Resident Verified', text2: `${userToApprove.name} has been approved.` });
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to approve resident' });
    }
  };

  const createGuard = async () => {
    if (!form.name || !form.phone || !form.employee_id) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill all required guard details' });
    }
    if (form.phone.length !== 10) {
      return Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid 10-digit mobile number.' });
    }
    setSaving(true);
    try {
      await GuardService.create({ ...form });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Guard account created successfully.' });
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to create guard' });
    } finally {
      setSaving(false);
    }
  };

  const approvePayment = async (id: string) => {
    try {
      await MaintenanceService.approve(id);
      Toast.show({ type: 'success', text1: 'Payment Verified', text2: 'Maintenance payment approved.' });
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to approve payment' });
    }
  };

  const rejectPayment = async (id: string) => {
    try {
      await MaintenanceService.reject(id);
      Toast.show({ type: 'error', text1: 'Payment Rejected', text2: 'Payment entry has been marked rejected.' });
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to reject payment' });
    }
  };

    const createService = async () => {
    if (!form.name) return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a name for the amenity/service' });
    setSaving(true);
    try {
      await AmenityService.create({
        name: form.name,
        category: form.category || 'facility',
        description: form.description || null,
        contact_info: form.contact_info || null,
        timing: form.timing || null,
        status: form.status || 'active'
      }, activeSocietyId);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Service created successfully.' });
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to create service' });
    } finally {
      setSaving(false);
    }
  };

  const deactivateGuard = async (id: string) => {
    try {
      await GuardService.deactivate(id);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Guard deactivated.' });
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed' });
    }
  };

  const deleteService = async (id: string) => {
    try {
      await AmenityService.delete(id);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Amenity deleted.' });
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed' });
    }
  };

  if (loading) return <LoadingScreen message="Loading admin portal..." />;

  const renderContent = () => {
    if (currentTab === 'dashboard') {
      const totalPendingActions = pendingResidents.length + pendingPayments.length;

      return (
        <View>
          {/* Action Required Banner */}
          {totalPendingActions > 0 && (
            <View style={{
              backgroundColor: Warm.amberDim,
              borderColor: Warm.amber,
              borderWidth: 1.5,
              borderRadius: 20,
              padding: 16,
              marginBottom: 20,
              ...Warm.shadow,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>⚡</Text>
                <Text style={{ fontWeight: '800', color: '#B45309', fontSize: 15 }}>
                  {totalPendingActions} Pending Approvals Require Attention
                </Text>
              </View>
              <Text style={{ color: '#92400E', fontSize: 13, marginBottom: 12 }}>
                {pendingResidents.length} resident verifications · {pendingPayments.length} payment receipts to verify.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {pendingResidents.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setCurrentTab('residents')}
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      borderColor: Warm.amber,
                      borderWidth: 1,
                      paddingVertical: 9,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 12 }}>
                      Review Residents ({pendingResidents.length})
                    </Text>
                  </TouchableOpacity>
                )}
                {pendingPayments.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setCurrentTab('maintenance')}
                    style={{
                      flex: 1,
                      backgroundColor: Warm.green,
                      paddingVertical: 9,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                      Review Payments ({pendingPayments.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Quick Metrics */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{
              flex: 1,
              backgroundColor: Warm.cardBg,
              borderColor: Warm.cardBorder,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              ...Warm.shadow,
            }}>
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Total Flats</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: Warm.accent, marginTop: 4 }}>{flats.length}</Text>
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
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Active Guards</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: Warm.green, marginTop: 4 }}>{guards.length}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{
              flex: 1,
              backgroundColor: Warm.cardBg,
              borderColor: Warm.cardBorder,
              borderWidth: 1,
              borderRadius: 18,
              padding: 16,
              ...Warm.shadow,
            }}>
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Active Residents</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: Warm.text, marginTop: 4 }}>{activeResidents.length}</Text>
            </View>
            <View style={{
              flex: 1,
              backgroundColor: Warm.cardBg,
              borderColor: pendingResidents.length > 0 ? Warm.amber : Warm.cardBorder,
              borderWidth: 1.5,
              borderRadius: 18,
              padding: 16,
              ...Warm.shadow,
            }}>
              <Text style={{ fontSize: 11, color: Warm.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Pending Residents</Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: pendingResidents.length > 0 ? Warm.amber : Warm.textDim, marginTop: 4 }}>
                {pendingResidents.length}
              </Text>
            </View>
          </View>

          {/* Management Shortcuts */}
          <View style={{
            backgroundColor: Warm.cardBg,
            borderColor: Warm.cardBorder,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            ...Warm.shadow,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginBottom: 14 }}>
              Society Management
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentTab('residents')}
              style={{
                backgroundColor: Warm.cardSubtle,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 22, marginRight: 12 }}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>Resident Verifications</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 1 }}>{pendingResidents.length} pending · {activeResidents.length} verified</Text>
              </View>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 14 }}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentTab('maintenance')}
              style={{
                backgroundColor: Warm.cardSubtle,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 22, marginRight: 12 }}>💰</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>Maintenance & Dues</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 1 }}>{pendingPayments.length} receipts awaiting review</Text>
              </View>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 14 }}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentTab('guards')}
              style={{
                backgroundColor: Warm.cardSubtle,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 22, marginRight: 12 }}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>Security Guards</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 1 }}>{guards.length} registered personnel</Text>
              </View>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 14 }}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (currentTab === 'residents') {
      return (
        <View>
          {pendingResidents.length > 0 && (
            <View style={{ marginBottom: 22 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309', marginBottom: 10, letterSpacing: 0.5 }}>
                ⏳ PENDING REGISTRATIONS ({pendingResidents.length})
              </Text>
              {pendingResidents.map((r: any) => (
                <View
                  key={r.id}
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
                    <Avatar name={r.name} color={Warm.amber} size={48} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{r.name}</Text>
                      <Text style={{ color: Warm.accent, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                        Flat {r.requested_flat?.flat_number} · 📞 {r.phone}
                      </Text>
                      {r.email && <Text style={{ color: Warm.textDim, fontSize: 11, marginTop: 1 }}>{r.email}</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => approveResident(r)}
                      style={{
                        backgroundColor: Warm.green,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>✓ Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginBottom: 12 }}>
            Active Verified Residents ({activeResidents.length})
          </Text>
          {activeResidents.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 18, padding: 30, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 32 }}>🏠</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', marginTop: 8 }}>No Active Residents</Text>
            </View>
          )}
          {activeResidents.map((r: any) => (
            <View
              key={r.id}
              style={{
                backgroundColor: Warm.cardBg,
                borderColor: Warm.cardBorder,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                ...Warm.shadow,
              }}
            >
              <Avatar name={r.name} size={42} color={Warm.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{r.name}</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>📞 {r.phone}</Text>
              </View>
              <View style={{ backgroundColor: Warm.greenDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ color: Warm.green, fontSize: 11, fontWeight: '700' }}>Active</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (currentTab === 'maintenance') {
      return (
        <View>
          {pendingPayments.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309', marginBottom: 10, letterSpacing: 0.5 }}>
                ⚡ PAYMENT PROOFS TO VERIFY ({pendingPayments.length})
              </Text>
              {pendingPayments.map((p: any) => (
                <View
                  key={p.id}
                  style={{
                    backgroundColor: Warm.cardBg,
                    borderColor: Warm.amber,
                    borderWidth: 1.5,
                    borderRadius: 18,
                    padding: 18,
                    marginBottom: 12,
                    ...Warm.shadow,
                  }}
                >
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 18 }}>FLAT {p.flat_number || p.flat_id}</Text>
                  <Text style={{ color: Warm.accent, fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                    Amount: ₹{p.amount} ({p.months_added} Months Extension)
                  </Text>
                  <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                    UTR / Reference: {p.utr_number}
                  </Text>

                  <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => rejectPayment(p.id)}
                      style={{
                        flex: 1,
                        backgroundColor: Warm.redDim,
                        borderColor: Warm.red + '44',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: Warm.red, fontWeight: '700', fontSize: 13 }}>✕ Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => approvePayment(p.id)}
                      style={{
                        flex: 1,
                        backgroundColor: Warm.green,
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>✓ Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 16, fontWeight: '800', color: Warm.text, marginBottom: 10 }}>
            Master Flat Directory
          </Text>
          <Input
            placeholder="Search Flat Number (e.g. 101, 23B)..."
            value={searchQuery}
            onChange={onSearchChange}
            onClear={() => onSearchChange('')}
            icon="🔍"
            returnKeyType="search"
            autoCapitalize="characters"
          />

          {maintenanceFlats.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 18, padding: 24, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 32 }}>🏢</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', marginTop: 6 }}>No Flats Match Search</Text>
            </View>
          )}

          {maintenanceFlats.map((f: any) => {
            const validUntil = f.maintenance_valid_until ? new Date(f.maintenance_valid_until) : null;
            const isExpired = !validUntil || validUntil < new Date();

            return (
              <View
                key={f.id}
                style={{
                  backgroundColor: Warm.cardBg,
                  borderColor: isExpired ? Warm.red + '44' : Warm.cardBorder,
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  ...Warm.shadow,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>Flat {f.flat_number}</Text>
                  <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                    {validUntil ? `Valid through ${formatDate(validUntil)}` : 'No active cycle recorded'}
                  </Text>
                </View>
                <View style={{ backgroundColor: isExpired ? Warm.redDim : Warm.greenDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: isExpired ? Warm.red : Warm.green, fontSize: 11, fontWeight: '700' }}>
                    {isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </Text>
                </View>
              </View>
            );
          })}

          {loadingMore && <ActivityIndicator size="small" color={Warm.accent} style={{ marginVertical: 20 }} />}
          {!loadingMore && flatPage < flatTotalPages && (
            <TouchableOpacity 
              onPress={() => {
                const nextPage = flatPage + 1;
                loadMaintenanceFlats(nextPage, searchQuery, true);
                setFlatPage(nextPage);
              }}
              style={{ backgroundColor: Warm.cardBg, borderColor: Warm.cardBorder, borderWidth: 1, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 }}
            >
              <Text style={{ color: Warm.text, fontWeight: '700', fontSize: 13 }}>Load More Flats ({maintenanceFlats.length} loaded)</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (currentTab === 'guards') {
      return (
        <View>
          <TouchableOpacity
            onPress={() => { setForm({ shift: 'morning' }); setModal('add_guard'); }}
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
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>+ Register New Guard</Text>
          </TouchableOpacity>

          {guards.length === 0 && (
            <View style={{ backgroundColor: Warm.cardBg, borderRadius: 18, padding: 30, alignItems: 'center', ...Warm.shadow }}>
              <Text style={{ fontSize: 32 }}>🛡️</Text>
              <Text style={{ color: Warm.text, fontWeight: '700', marginTop: 8 }}>No Guards Registered</Text>
            </View>
          )}

          {guards.map((g: any) => (
            <View
              key={g.id}
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
              <Avatar name={g.user?.name || 'G'} size={42} color={Warm.green} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 15 }}>{g.user?.name}</Text>
                <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                  ID: {g.employee_id} · 📞 {g.user?.phone}
                </Text>
              </View>
              <View style={{ flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <View style={{ backgroundColor: g.shift === 'morning' ? Warm.amberDim : Warm.accentDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: g.shift === 'morning' ? '#B45309' : Warm.accent, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                    {g.shift} Shift
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deactivateGuard(g.id)} style={{ backgroundColor: Warm.redDim, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: Warm.red, fontSize: 10, fontWeight: '800' }}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (currentTab === 'services') {
      return (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: Warm.text }}>Society Amenities</Text>
            <TouchableOpacity
              onPress={() => { setForm({ category: 'facility', status: 'active' }); setModal('add_service'); }}
              style={{ backgroundColor: Warm.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          
          {services.length === 0 && (
            <EmptyState icon="🛠️" title="No Services Added" message="Start adding society amenities and contacts." />
          )}

          {services.map((s: any) => (
            <View key={s.id} style={{
              backgroundColor: Warm.cardBg, borderColor: Warm.cardBorder, borderWidth: 1,
              borderRadius: 16, padding: 16, marginBottom: 10, ...Warm.shadow,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{s.name}</Text>
                  {s.description && <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 4 }}>{s.description}</Text>}
                  {s.contact_info && <Text style={{ color: Warm.accent, fontSize: 12, marginTop: 4, fontWeight: '600' }}>📞 {s.contact_info}</Text>}
                  {s.timing && <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>🕒 {s.timing}</Text>}
                </View>
                <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <View style={{ backgroundColor: s.status === 'active' ? Warm.greenDim : Warm.redDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ color: s.status === 'active' ? Warm.green : Warm.red, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                      {s.status}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteService(s.id)} style={{ backgroundColor: Warm.redDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: Warm.red, fontSize: 10, fontWeight: '800' }}>DELETE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (currentTab === 'profile') {      return (
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
            <Text style={{ color: Warm.text, fontSize: 24, fontWeight: '800', marginTop: 14 }}>{user?.name}</Text>
            <Text style={{ color: Warm.textMuted, fontSize: 15, marginTop: 2 }}>{user?.phone}</Text>
            {user?.email && <Text style={{ color: Warm.textDim, fontSize: 13, marginTop: 2 }}>{user?.email}</Text>}
            <View style={{ backgroundColor: Warm.accentDim, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 }}>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 11 }}>SOCIETY ADMINISTRATOR</Text>
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
            <Text style={{ color: Warm.red, fontWeight: '800', fontSize: 15 }}>Log Out of Admin Account</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Warm.bg }}>
      {/* ── Top Header ── */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {user?.role === 'super_admin' ? (
              <TouchableOpacity
                onPress={() => navigation?.navigate('SuperAdmin')}
                style={{ backgroundColor: Warm.accentDim, borderColor: Warm.accent + '66', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
              >
                <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 11 }}>← PLATFORM ADMIN</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => setCurrentTab('profile')} style={{
              shadowColor: '#4A3E3D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
            }}>
              <Avatar name={user?.name || '?'} size={34} color={Warm.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Main Scroll View ── */}
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 18, paddingTop: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Warm.accent} />}
        scrollEventThrottle={400}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 150;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            if (!loadingMore && flatPage < flatTotalPages && currentTab === 'maintenance') {
              const nextPage = flatPage + 1;
              loadMaintenanceFlats(nextPage, searchQuery, true);
              setFlatPage(nextPage);
            }
          }
        }}
      >
        <Animated.View {...panResponder.panHandlers} style={{ minHeight: Dimensions.get('window').height - 230, transform: [{ translateX: slideAnim }], paddingBottom: 85 + Math.max(insets.bottom, 16) }}>
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* ── Admin Bottom Navigation Bar ── */}
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
          { id: 'dashboard', label: 'Manage', icon: '📊' },
          { id: 'residents', label: 'Residents', icon: '👥' },
          { id: 'maintenance', label: 'Dues', icon: '💰' },
          { id: 'guards', label: 'Guards', icon: '🛡️' },
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

      {/* ── Add Guard Modal ── */}
      {modal === 'add_guard' && (
        <Modal title="Register Security Guard" subtitle="Register a new guard profile" onClose={() => setModal(null)}>
          <Input
            label="Guard Full Name *"
            placeholder="e.g. Suraj Singh"
            value={form?.name || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), name: v }))}
          />
          <Input
            label="Phone Number *"
            placeholder="98765 43210"
            maxLength={10}
            keyboardType="number-pad"
            value={form?.phone || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), phone: v.replace(/[^0-9]/g, '') }))}
          />
          <Input
            label="Employee ID *"
            placeholder="e.g. SEC-001"
            value={form?.employee_id || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), employee_id: v }))}
          />
          <Input
            label="4-Digit Kiosk PIN (Optional)"
            placeholder="e.g. 1234"
            maxLength={4}
            keyboardType="number-pad"
            value={form?.shift_pin || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), shift_pin: v.replace(/[^0-9]/g, '') }))}
          />
          <Select
            label="Duty Shift"
            value={form?.shift || 'morning'}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), shift: v }))}
            options={[
              { value: 'morning', label: 'Morning Shift (06:00 - 18:00)' },
              { value: 'night', label: 'Night Shift (18:00 - 06:00)' },
            ]}
          />
          <Btn full variant="green" onClick={createGuard} loading={saving} style={{ marginTop: 12 }}>
            Register Guard Account →
          </Btn>
        </Modal>
      )}

      {/* ── Add Service Modal ── */}
      {modal === 'add_service' && (
        <Modal title="Add Society Amenity" subtitle="Register a facility or service contact" onClose={() => setModal(null)}>
          <Input
            label="Contact Name / Service Provider *"
            placeholder="Name"
            value={form?.name || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), name: v }))}
          />
          <Select
            label="Service Type *"
            value={form?.category || 'Plumber'}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), category: v }))}
            options={[
              { value: 'Electrician', label: 'Electrician' },
              { value: 'Plumber', label: 'Plumber' },
              { value: 'Carpenter', label: 'Carpenter' },
              { value: 'Maid / Cleaner', label: 'Maid / Cleaner' },
              { value: 'Other', label: 'Other' },
            ]}
          />
          <Input
            label="Contact Info (Optional)"
            placeholder="Phone or Email"
            value={form?.contact_info || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), contact_info: v }))}
          />
          <Input
            label="Timings (Optional)"
            placeholder="e.g. 06:00 AM - 10:00 PM"
            value={form?.timing || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), timing: v }))}
          />
          <Input
            label="Description (Optional)"
            placeholder="Any extra details"
            value={form?.description || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), description: v }))}
          />
          <Btn full variant="green" onClick={createService} loading={saving} style={{ marginTop: 12 }}>
            Save Amenity →
          </Btn>
        </Modal>
      )}
    </View>
  );
}
