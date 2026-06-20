import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView, Image, BackHandler, Linking, PanResponder, Dimensions, Animated } from 'react-native';
import { VisitorLogService, PreApprovalService, FrequentPassService, MaintenanceService, AnnouncementService, FlatUserService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, PageLayout, StatCard, EmptyState, LoadingScreen, Modal, Tabs, Calendar } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';

export function ResidentDashboard({ route }: any) {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState(route?.params?.tab || 'dashboard');

  const tabOrder = ['dashboard', 'history', 'bills', 'passes', 'profile'];
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
  const tabScrollRef = useRef<ScrollView>(null);

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

    // Scroll tab bar to active tab position
    const tabOffsets: any = {
      dashboard: 0,
      history: 30,
      bills: 130,
      passes: 200,
      profile: 300,
    };
    const offset = tabOffsets[currentTab] || 0;
    tabScrollRef.current?.scrollTo({ x: offset, animated: true });
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
  const [members, setMembers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [preApprovals, setPreApprovals] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pr, lr, br, mr, ar, par, fpr] = await Promise.all([
        VisitorLogService.getMyPending().catch(() => ({data:{data:[]}})),
        VisitorLogService.getMyLogs({per_page:20}).catch(() => ({data:{data:[]}})),
        MaintenanceService.getMy().catch(() => ({data:{data:{payments:[]}}})),
        FlatUserService.getMyFlat().catch(() => ({data:{data:[]}})),
        AnnouncementService.getAll().catch(() => ({data:{data:[]}})),
        PreApprovalService.getMy().catch(() => ({data:{data:[]}})),
        FrequentPassService.getMy().catch(() => ({data:{data:[]}})),
      ]);
      setPending(pr.data?.data || []);
      setLogs(lr.data?.data?.items || lr.data?.data || []);
      setFlatStatus(br.data?.data?.flat || null);
      setPayments(br.data?.data?.payments || []);
      setMembers(mr.data?.data || []);
      setAnnouncements(ar.data?.data?.items || ar.data?.data || []);
      setPreApprovals(par.data?.data || []);
      setPasses(fpr.data?.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const approve = async (id: string) => { try { await VisitorLogService.approve(id); load(); } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } };
  const deny = async (id: string) => { try { await VisitorLogService.deny(id); load(); } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } };
  const confirmDepart = async (id: string) => { try { await VisitorLogService.confirmDeparture(id); load(); } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } };
  const submitRenewal = async () => {
    if (!form.utr_number || form.utr_number.length < 5) return Alert.alert('Error', 'Please enter a valid UTR number');
    try { 
      await MaintenanceService.submitPayment({ amount: modal.amount, months_added: modal.months_added, utr_number: form.utr_number }); 
      setModal(null); 
      load(); 
      Alert.alert('Success', 'Payment submitted for approval!'); 
    } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } 
  };
  const openUPI = (amount: number) => {
    const upiId = process.env.EXPO_PUBLIC_UPI_ID || 'test@ybl';
    Linking.openURL(`upi://pay?pa=${upiId}&pn=RM2%20Residency&am=${amount}&cu=INR`).catch(() => Alert.alert('Error', 'No UPI app found. Please pay manually.'));
  };
  const createPre = async () => {
    if (!form.visitor_name?.trim()) return Alert.alert('Error', 'Guest Name is required');
    if (!form.visitor_phone?.trim()) return Alert.alert('Error', 'Guest Phone is required');
    if (!form.valid_until) return Alert.alert('Error', 'Please select an expiry date');

    try {
      const today = new Date();
      // Format valid_from to start of today (ISO Format)
      const validFromStr = today.toISOString().split('T')[0] + 'T00:00:00';
      // Format valid_until to end of selected day (ISO Format)
      const validUntilStr = form.valid_until + 'T23:59:59';

      await PreApprovalService.create({
        visitor_name: form.visitor_name.trim(),
        visitor_phone: form.visitor_phone.trim(),
        purpose: form.purpose?.trim() || 'Guest',
        valid_from: validFromStr,
        valid_until: validUntilStr,
      });
      setModal(null);
      load();
      Alert.alert('Success', 'Guest pre-approved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create pre-approval');
    }
  };
  const cancelPre = async (id: string) => { try { await PreApprovalService.cancel(id); load(); } catch (err: any) { Alert.alert('Error', 'Failed'); } };

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  const renderContent = () => {
    if (currentTab === 'dashboard') return (
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <StatCard label="Pending" value={pending.length} color={pending.length>0?T.amber:T.green} />
          <StatCard label="Flat Status" value={flatStatus?.maintenance_valid_until && new Date(flatStatus.maintenance_valid_until) >= new Date() ? 'Active' : 'Expired'} color={flatStatus?.maintenance_valid_until && new Date(flatStatus.maintenance_valid_until) >= new Date() ? T.green : T.red} />
        </View>

        {pending.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.amber, marginBottom: 12 }}>⏳ AWAITING APPROVAL</Text>
            {pending.map((log: any) => (
              <Card key={log.id} style={{ borderColor: T.amber+'55' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {log.visitor?.photo_url ? (
                    <Image source={{ uri: log.visitor.photo_url.startsWith('http') ? log.visitor.photo_url : `${BASE_URL.replace('/api/v1','')}${log.visitor.photo_url}` }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <Avatar name={log.visitor?.name||'V'} color={T.amber} size={48} />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                    <Text style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>{log.purpose} · {log.visitor?.phone}</Text>
                    {log.vehicle_number && <Text style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>Vehicle: {log.vehicle_number}</Text>}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
                  <Btn variant="red" style={{ flex: 1 }} onClick={() => deny(log.id)}>✕ Deny</Btn>
                  <Btn variant="green" style={{ flex: 1, marginLeft: 10 }} onClick={() => approve(log.id)}>✓ Approve</Btn>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 12 }}>RECENT VISITORS</Text>
        {logs.slice(0, 5).map((log: any) => (
          <Card key={log.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={log.visitor?.name||'V'} size={40} color={log.approval_status==='approved'?T.green:log.approval_status==='denied'?T.red:T.amber} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '600', color: T.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{log.purpose} · {new Date(log.created_at).toLocaleDateString()}</Text>
              </View>
              <Badge color={log.approval_status==='approved'?'green':log.approval_status==='denied'?'red':'amber'} small>
                {log.status||log.approval_status}
              </Badge>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'passes') return (
      <View>
        <Btn onClick={() => { setForm({}); setModal({ type: 'pre' }); }} style={{ marginBottom: 16 }}>+ Pre-Approve Guest</Btn>
        {preApprovals.length === 0 && passes.length === 0 && <EmptyState icon="✅" message="No passes or pre-approvals" />}
        {preApprovals.map((pa: any) => (
          <Card key={pa.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{pa.visitor_name}</Text>
                <Text style={{ color: T.muted, fontSize: 13 }}>{pa.visitor_phone} · {pa.purpose||'Guest'}</Text>
                <Text style={{ color: T.dim, fontSize: 11, marginTop: 4 }}>Valid until {new Date(pa.valid_until).toLocaleDateString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge color={pa.status==='active'?'green':'red'} small>{pa.status}</Badge>
                {pa.status === 'active' && <Btn variant="ghost" sm onClick={() => cancelPre(pa.id)} style={{ marginTop: 8 }}>Cancel</Btn>}
              </View>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'history') return (
      <View>
        {logs.length === 0 && <EmptyState icon="📋" message="No visit history" />}
        {logs.map((log: any) => (
          <Card key={log.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={log.visitor?.name||'V'} size={40} color={T.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', color: T.text, fontSize: 15 }}>{log.visitor?.name}</Text>
                <Text style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{log.purpose} · {new Date(log.created_at).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge color={log.status==='inside'?'green':log.status==='exited'?'blue':'amber'} small>{log.status}</Badge>
                {(log.status === 'inside' || log.status === 'overdue') && <Btn variant="ghost" sm onClick={() => confirmDepart(log.id)} style={{ marginTop: 8 }}>Departed</Btn>}
              </View>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'bills') {
      const validUntil = flatStatus?.maintenance_valid_until ? new Date(flatStatus.maintenance_valid_until) : null;
      const isExpired = !validUntil || validUntil < new Date();
      const expiringSoon = validUntil && !isExpired && (validUntil.getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 15;
      
      return (
        <View>
          <Card style={{ marginBottom: 24, borderColor: isExpired ? T.red+'88' : expiringSoon ? T.amber+'88' : T.green+'88', borderWidth: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.muted, marginBottom: 8 }}>MAINTENANCE STATUS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: isExpired ? T.red : T.text }}>
                  {isExpired ? 'Expired' : 'Active'}
                </Text>
                <Text style={{ color: T.muted, fontSize: 14, marginTop: 4 }}>
                  {validUntil ? `Valid until ${validUntil.toLocaleDateString()}` : 'No payment history'}
                </Text>
              </View>
              {!isExpired && !expiringSoon && <Badge color="green" style={{ transform: [{scale:1.2}] }}>✅ Good</Badge>}
            </View>
            
            {(isExpired || expiringSoon) && (
              <View style={{ marginTop: 20 }}>
                {expiringSoon && <Text style={{ color: T.amber, marginBottom: 12, fontWeight: '600' }}>⚠️ Expiring soon. Please renew.</Text>}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn variant="blue" style={{ flex: 1 }} onClick={() => { setForm({}); setModal({ type: 'renew', amount: 1200, months_added: 6 }); }}>Renew 6M</Btn>
                  <Btn variant="green" style={{ flex: 1 }} onClick={() => { setForm({}); setModal({ type: 'renew', amount: 2400, months_added: 12 }); }}>Renew 1Y</Btn>
                </View>
              </View>
            )}
          </Card>

          <Text style={{ fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 12 }}>PAYMENT HISTORY</Text>
          {payments.length === 0 && <EmptyState icon="💰" message="No payment history" />}
          {payments.map((p: any) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>₹{p.amount} ({p.months_added} Months)</Text>
                  <Text style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>Submitted: {new Date(p.created_at).toLocaleDateString()}</Text>
                  <Text style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>UTR: {p.utr_number}</Text>
                </View>
                <Badge color={p.status==='approved'?'green':p.status==='rejected'?'red':'amber'} small>{p.status}</Badge>
              </View>
            </Card>
          ))}
        </View>
      );
    }

    if (currentTab === 'notices') return (
      <View>
        {announcements.length === 0 && <EmptyState icon="📢" message="No announcements" />}
        {announcements.map((a: any) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{a.priority==='urgent'?'🚨':'📢'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{a.title}</Text>
                <Text style={{ color: T.muted, fontSize: 13, marginTop: 4, lineHeight: 20 }}>{a.body}</Text>
                <Text style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>{new Date(a.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'profile') return (
      <View>
        <Card style={{ alignItems: 'center', padding: 30 }}>
          <Avatar name={user?.name || '?'} size={80} />
          <Text style={{ color: T.text, fontSize: 24, fontWeight: '800', marginTop: 16 }}>{user?.name}</Text>
          <Text style={{ color: T.muted, fontSize: 16, marginTop: 4 }}>{user?.phone}</Text>
          {user?.email && <Text style={{ color: T.dim, fontSize: 13, marginTop: 4 }}>{user?.email}</Text>}
          {flatStatus?.flat_number && <Text style={{ color: T.accent, fontSize: 15, fontWeight: '700', marginTop: 12 }}>🏠 Flat {flatStatus.flat_number}</Text>}
          {user?.role && <Badge color="blue" style={{ marginTop: 12 }}>{user?.role?.toUpperCase()}</Badge>}
        </Card>
        <Btn variant="red" full onClick={logout} style={{ marginTop: 24 }}>Log Out</Btn>
      </View>
    );
  };

  return (
    <PageLayout 
      title="Resident" 
      subtitle="RM2 Residency"
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      <ScrollView ref={tabScrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -24, paddingHorizontal: 24 }}>
        <Tabs tabs={[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'history', label: 'Visitor History' },
          { id: 'bills', label: 'Bills' },
          { id: 'passes', label: 'Passes' },
          { id: 'profile', label: 'Profile' },
        ]} active={currentTab} onChange={setCurrentTab} />
      </ScrollView>

      <Animated.View {...panResponder.panHandlers} style={{ minHeight: Dimensions.get('window').height - 200, transform: [{ translateX: slideAnim }] }}>
        {renderContent()}
      </Animated.View>

      {modal?.type === 'renew' && (
        <Modal title={`Renew Maintenance`} subtitle={`Amount: ₹${modal?.amount} for ${modal?.months_added} Months`} onClose={() => setModal(null)}>
          <Text style={{ color: T.muted, marginBottom: 16 }}>1. Tap the button below to open your UPI app and pay.</Text>
          <Btn variant="blue" full onClick={() => openUPI(modal?.amount)} style={{ marginBottom: 24 }}>Pay via UPI App</Btn>
          
          <Text style={{ color: T.muted, marginBottom: 12 }}>2. Enter the 12-digit UTR/Reference number below after paying.</Text>
          <Input label="UTR Number" placeholder="e.g. 123456789012" value={form?.utr_number || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), utr_number: v}))} />
          <Btn full variant="green" onClick={submitRenewal} style={{ marginTop: 8 }}>Submit for Approval</Btn>
        </Modal>
      )}

      {modal?.type === 'pre' && (
        <Modal title="Pre-Approve Guest" onClose={() => setModal(null)}>
          <Input label="Guest Name *" placeholder="Full name" value={form?.visitor_name || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), visitor_name: v}))} />
          <Input label="Guest Phone *" placeholder="Phone number" value={form?.visitor_phone || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), visitor_phone: v}))} />
          <Input label="Purpose" placeholder="E.g. Party" value={form?.purpose || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), purpose: v}))} />
          <Text style={{ color: T.text, fontWeight: '700', fontSize: 14, marginTop: 12, marginBottom: 4 }}>Valid Until *</Text>
          <Calendar value={form?.valid_until || ''} onChange={(v: string) => setForm((prev: any) => ({...(prev || {}), valid_until: v}))} />
          <Btn full onClick={createPre} style={{ marginTop: 16 }}>Save Pre-Approval</Btn>
        </Modal>
      )}
    </PageLayout>
  );
}
