import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, ScrollView, BackHandler, PanResponder, Dimensions, ActivityIndicator, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, Card, Btn, StatCard, EmptyState, LoadingScreen, Tabs, Avatar, Badge, Input, Select, Modal, SocietySwitcher } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { UserService, FlatUserService, GuardService, FlatService, MaintenanceService } from '../../services';
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
  const tabOrder = ['dashboard', 'residents', 'maintenance', 'guards', 'profile'];
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [flatPage, setFlatPage] = useState(1);
  const [flatTotalPages, setFlatTotalPages] = useState(1);
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [modal, setModal] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

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
      const [fr, gr, pr, ar, p_pay] = await Promise.all([
        FlatService.getAll({ per_page: 5000, society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        GuardService.getAll({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        UserService.getAll({ role: 'resident', status: 'pending_verification', society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        UserService.getAll({ role: 'resident', status: 'active', society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
        MaintenanceService.getPending({ society_id: activeSocietyId }).catch(() => ({ data: { data: [] } })),
      ]);
      setFlats(fr.data?.data?.items || fr.data?.data || []);
      setGuards(gr.data?.data?.items || gr.data?.data || []);
      setPendingResidents(pr.data?.data?.items || pr.data?.data || []);
      setActiveResidents(ar.data?.data?.items || ar.data?.data || []);
      setPendingPayments(p_pay.data?.data || []);
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
      Alert.alert('Resident Verified', `${userToApprove.name} has been approved.`);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve resident');
    }
  };

  const createGuard = async () => {
    if (!form.name || !form.phone || !form.employee_id || !form.password) {
      return Alert.alert('Error', 'Please fill all required guard details');
    }
    try {
      await GuardService.create({ ...form });
      Alert.alert('Success', 'Guard account created successfully.');
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create guard');
    }
  };

  const approvePayment = async (id: string) => {
    try {
      await MaintenanceService.approve(id);
      Alert.alert('Payment Verified', 'Maintenance payment approved.');
      load();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to approve payment');
    }
  };

  const rejectPayment = async (id: string) => {
    try {
      await MaintenanceService.reject(id);
      Alert.alert('Payment Rejected', 'Payment entry has been marked rejected.');
      load();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to reject payment');
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
                    {validUntil ? `Valid through ${validUntil.toLocaleDateString()}` : 'No active cycle recorded'}
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
              <View style={{ backgroundColor: g.shift === 'morning' ? Warm.amberDim : Warm.accentDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ color: g.shift === 'morning' ? '#B45309' : Warm.accent, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                  {g.shift} Shift
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
          {user?.role === 'super_admin' ? (
            <TouchableOpacity
              onPress={() => navigation?.navigate('SuperAdmin')}
              style={{ backgroundColor: Warm.accentDim, borderColor: Warm.accent + '66', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
            >
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 11 }}>← PLATFORM ADMIN</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: Warm.accentDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
              <Text style={{ color: Warm.accent, fontWeight: '800', fontSize: 11 }}>ADMIN CONSOLE</Text>
            </View>
          )}
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
          { id: 'dashboard', label: 'Overview', icon: '📊' },
          { id: 'residents', label: 'Residents', icon: '👥' },
          { id: 'maintenance', label: 'Dues', icon: '💰' },
          { id: 'guards', label: 'Guards', icon: '🛡️' },
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

      {/* ── Add Guard Modal ── */}
      {modal === 'add_guard' && (
        <Modal title="Register Security Guard" subtitle="Create login credentials for guard terminal" onClose={() => setModal(null)}>
          <Input
            label="Guard Full Name *"
            placeholder="e.g. Suraj Singh"
            value={form?.name || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), name: v }))}
          />
          <Input
            label="Phone Number *"
            placeholder="98765 43210"
            value={form?.phone || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), phone: v }))}
          />
          <Input
            label="Employee ID *"
            placeholder="e.g. SEC-001"
            value={form?.employee_id || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), employee_id: v }))}
          />
          <Input
            label="Login Password *"
            type="password"
            placeholder="Minimum 6 characters"
            value={form?.password || ''}
            onChange={(v: string) => setForm((prev: any) => ({ ...(prev || {}), password: v }))}
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
          <Btn full variant="green" onClick={createGuard} style={{ marginTop: 12 }}>
            Register Guard Account →
          </Btn>
        </Modal>
      )}
    </View>
  );
}
