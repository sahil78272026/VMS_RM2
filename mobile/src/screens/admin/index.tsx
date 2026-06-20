import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, ScrollView, BackHandler, PanResponder, Dimensions, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { T, Card, Btn, PageLayout, StatCard, EmptyState, LoadingScreen, Tabs, Avatar, Badge, Input, Select, Modal } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { UserService, FlatUserService, GuardService, FlatService, MaintenanceService } from '../../services';

export function AdminDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const tabOrder = ['dashboard', 'maintenance', 'profile'];
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

  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevTabRef = useRef(currentTab);

  useEffect(() => {
    const prevIdx = tabOrder.indexOf(prevTabRef.current);
    const newIdx = tabOrder.indexOf(currentTab);
    if (prevIdx !== newIdx) {
      const screenWidth = Dimensions.get('window').width;
      const startVal = newIdx > prevIdx ? screenWidth * 0.25 : -screenWidth * 0.25;
      slideAnim.setValue(startVal);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
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
  
  const [modal, setModal] = useState<string|null>(null);
  const [form, setForm] = useState<any>({});

  const isLoadingRef = useRef(false);

  const loadMaintenanceFlats = useCallback(async (page: number, query: string, append = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (page > 1) setLoadingMore(true);
    try {
      const res = await MaintenanceService.getFlats({ page, per_page: 20, query });
      const newItems = res.data?.data?.items || [];
      if (append) {
        setMaintenanceFlats(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNew = newItems.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setMaintenanceFlats(newItems);
      }
      setFlatTotalPages(res.data?.data?.pages || 1);
    } catch {}
    setLoadingMore(false);
    isLoadingRef.current = false;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setFlatPage(1);
    await Promise.all([
      load(),
      loadMaintenanceFlats(1, searchQuery, false)
    ]);
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    setScrollY(contentOffset.y);
    if (currentTab !== 'maintenance') return;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
    if (isCloseToBottom && !loadingMore && flatPage < flatTotalPages) {
      const nextPage = flatPage + 1;
      setFlatPage(nextPage);
      loadMaintenanceFlats(nextPage, searchQuery, true);
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    loadMaintenanceFlats(1, '', false);
  }, [loadMaintenanceFlats]);

  const onSearchChange = (v: string) => {
    setSearchQuery(v);
    setFlatPage(1);
    loadMaintenanceFlats(1, v, false);
  };

  const load = useCallback(async () => {
    try {
      const [fr, gr, pr, ar, p_pay] = await Promise.all([
        FlatService.getAll({ per_page: 500 }).catch(() => ({data:{data:[]}})),
        GuardService.getAll().catch(() => ({data:{data:[]}})),
        UserService.getAll({ role: 'resident', status: 'pending_verification' }).catch(() => ({data:{data:[]}})),
        UserService.getAll({ role: 'resident', status: 'active' }).catch(() => ({data:{data:[]}})),
        MaintenanceService.getPending().catch(() => ({data:{data:[]}})),
      ]);
      setFlats(fr.data?.data?.items || fr.data?.data || []);
      setGuards(gr.data?.data?.items || gr.data?.data || []);
      setPendingResidents(pr.data?.data?.items || pr.data?.data || []);
      setActiveResidents(ar.data?.data?.items || ar.data?.data || []);
      setPendingPayments(p_pay.data?.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const approveResident = async (user: any) => {
    try {
      await FlatUserService.addPrimary({
        user_id: user.id,
        flat_id: user.requested_flat_id,
        role: 'primary',
        is_owner: true,
        move_in_date: user.move_in_date || new Date().toISOString().split('T')[0]
      });
      Alert.alert('Success', 'Resident approved!');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to approve resident');
    }
  };

  const createGuard = async () => {
    if (!form.name || !form.phone || !form.employee_id || !form.password) return Alert.alert('Error', 'Fill required fields');
    try {
      await GuardService.create({ ...form });
      Alert.alert('Success', 'Guard created successfully');
      setModal(null);
      setForm({});
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create guard');
    }
  };

  const approvePayment = async (id: string) => {
    try { await MaintenanceService.approve(id); Alert.alert('Success', 'Payment Approved'); load(); }
    catch (err: any) { Alert.alert('Error', 'Failed to approve'); }
  };

  const rejectPayment = async (id: string) => {
    try { await MaintenanceService.reject(id); Alert.alert('Success', 'Payment Rejected'); load(); }
    catch (err: any) { Alert.alert('Error', 'Failed to reject'); }
  };

  if (loading) return <LoadingScreen message="Loading admin dashboard..." />;

  const renderContent = () => {
    if (currentTab === 'dashboard') return (
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <StatCard label="Total Flats" value={flats.length} color={T.accent} />
          <StatCard label="Guards" value={guards.length} color={T.green} />
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <StatCard label="Pending Residents" value={pendingResidents.length} color={pendingResidents.length > 0 ? T.amber : T.muted} />
          <StatCard label="Active Residents" value={activeResidents.length} color={T.accent} />
        </View>
        <Card>
          <Text style={{ color: T.text, fontSize: 16, fontWeight: '700', marginBottom: 16 }}>Quick Actions</Text>
          <Btn variant="outline" style={{ marginBottom: 12 }} onClick={() => setCurrentTab('residents')}>Manage Residents</Btn>
          <Btn variant="outline" style={{ marginBottom: 12 }} onClick={() => setCurrentTab('guards')}>Manage Guards</Btn>
        </Card>
      </View>
    );

    if (currentTab === 'residents') return (
      <View>
        {pendingResidents.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.amber, marginBottom: 12 }}>⏳ PENDING APPROVALS ({pendingResidents.length})</Text>
            {pendingResidents.map((r: any) => (
              <Card key={r.id} style={{ borderColor: T.amber+'55' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar name={r.name} color={T.amber} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{r.name}</Text>
                    <Text style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Flat {r.requested_flat?.flat_number} · {r.phone}</Text>
                  </View>
                  <Btn variant="green" sm onClick={() => approveResident(r)}>✓ Approve</Btn>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 12 }}>ACTIVE RESIDENTS ({activeResidents.length})</Text>
        {activeResidents.length === 0 && <EmptyState icon="🏠" message="No active residents" />}
        {activeResidents.map((r: any) => (
          <Card key={r.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={r.name} size={40} color={T.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '600', color: T.text, fontSize: 15 }}>{r.name}</Text>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{r.phone}</Text>
              </View>
              <Badge color="green" small>Active</Badge>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'guards') return (
      <View>
        <Btn onClick={() => { setForm({ shift: 'morning' }); setModal('add_guard'); }} style={{ marginBottom: 16 }}>+ Add New Guard</Btn>
        {guards.length === 0 && <EmptyState icon="🛡️" message="No guards registered" />}
        {guards.map((g: any) => (
          <Card key={g.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={g.user?.name||'G'} size={40} color={T.green} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', color: T.text, fontSize: 15 }}>{g.user?.name}</Text>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>ID: {g.employee_id} · {g.user?.phone}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge color={g.shift==='morning'?'amber':'blue'} small>{g.shift} Shift</Badge>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'maintenance') return (
      <View>
        {pendingPayments.length > 0 && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.amber, marginBottom: 12 }}>⚡ ACTION REQUIRED ({pendingPayments.length})</Text>
            {pendingPayments.map((p: any) => {
              return (
                <Card key={p.id} style={{ borderColor: T.amber+'55' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: T.text, fontSize: 18 }}>FLAT {p.flat_number || p.flat_id}</Text>
                      <Text style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Paid: ₹{p.amount} ({p.months_added} Months)</Text>
                      <Text style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>UTR: {p.utr_number}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                    <Btn variant="red" style={{ flex: 1 }} onClick={() => rejectPayment(p.id)}>✕ Reject</Btn>
                    <Btn variant="green" style={{ flex: 1 }} onClick={() => approvePayment(p.id)}>✓ Approve</Btn>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 12 }}>MASTER DIRECTORY</Text>
        <Input placeholder="Search Flat Number..." value={searchQuery} onChange={onSearchChange} onClear={() => onSearchChange('')} icon="🔍" />
        {maintenanceFlats.length === 0 && <EmptyState icon="🏢" message="No flats found" />}
        {maintenanceFlats.map((f: any) => {
          const validUntil = f.maintenance_valid_until ? new Date(f.maintenance_valid_until) : null;
          const isExpired = !validUntil || validUntil < new Date();
          const flatColor = f.flat_number?.endsWith('A') ? '#60a5fa' : f.flat_number?.endsWith('B') ? '#4ade80' : T.text;
          return (
            <Card key={f.id} style={{ marginBottom: 8, borderColor: isExpired ? T.red+'44' : T.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: flatColor, fontSize: 16 }}>Flat {f.flat_number}</Text>
                  <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
                    {validUntil ? `Valid until ${validUntil.toLocaleDateString()}` : 'No payment history'}
                  </Text>
                </View>
                <Badge color={isExpired ? 'red' : 'green'} small>{isExpired ? 'Expired' : 'Active'}</Badge>
              </View>
            </Card>
          );
        })}
        
        {loadingMore && <ActivityIndicator size="small" color={T.accent} style={{ marginVertical: 20 }} />}
      </View>
    );

    if (currentTab === 'profile') return (
      <View>
        <Card style={{ alignItems: 'center', padding: 30 }}>
          <Avatar name={user?.name || '?'} size={80} />
          <Text style={{ color: T.text, fontSize: 24, fontWeight: '800', marginTop: 16 }}>{user?.name}</Text>
          <Text style={{ color: T.muted, fontSize: 16, marginTop: 4 }}>{user?.phone}</Text>
          {user?.email && <Text style={{ color: T.dim, fontSize: 13, marginTop: 4 }}>{user?.email}</Text>}
          {user?.role && <Badge color="blue" style={{ marginTop: 12 }}>{user?.role?.toUpperCase()}</Badge>}
        </Card>
        <Btn variant="red" full onClick={logout} style={{ marginTop: 24 }}>Log Out</Btn>
      </View>
    );
  };

  return (
    <PageLayout 
      title="Admin" 
      subtitle="Society Management"
      onRefresh={handleRefresh}
      refreshing={refreshing}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      scrollRef={scrollRef}
      floating={currentTab === 'maintenance' && scrollY > 300 && (
        <TouchableOpacity
          onPress={scrollToTop}
          style={{
            position: 'absolute', bottom: 30, right: 24,
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center',
            elevation: 6, shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
          }}
        >
          <Text style={{ color: T.bg, fontSize: 20, fontWeight: '800' }}>↑</Text>
        </TouchableOpacity>
      )}
    >
      <Tabs tabs={[
        { id: 'dashboard', label: 'Overview' },
        { id: 'maintenance', label: 'Maintenance' },
        { id: 'profile', label: 'Profile' },
      ]} active={currentTab} onChange={setCurrentTab} />

      <Animated.View {...panResponder.panHandlers} style={{ minHeight: Dimensions.get('window').height - 200, transform: [{ translateX: slideAnim }] }}>
        {renderContent()}
      </Animated.View>

      {modal === 'add_guard' && (
        <Modal title="Register Guard" onClose={() => setModal(null)}>
          <Input label="Full Name *" placeholder="Guard Name" value={form?.name || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), name: v}))} />
          <Input label="Phone *" placeholder="Phone Number" value={form?.phone || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), phone: v}))} />
          <Input label="Employee ID *" placeholder="EMP-001" value={form?.employee_id || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), employee_id: v}))} />
          <Input label="Password *" type="password" value={form?.password || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), password: v}))} />
          <Select label="Shift" value={form?.shift || 'morning'} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), shift: v}))} options={[{value:'morning',label:'Morning'},{value:'night',label:'Night'}]} />
          <Btn full variant="green" onClick={createGuard}>Create Guard</Btn>
        </Modal>
      )}
    </PageLayout>
  );
}
