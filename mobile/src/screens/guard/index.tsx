import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, ScrollView, BackHandler } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { VisitorLogService, GateSessionService, GateService, FlatService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, PageLayout, StatCard, EmptyState, LoadingScreen, Tabs } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';

export function GuardDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

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
  
  const [form, setForm] = useState<any>({ entry_mode: 'foot', stay_duration: '1_2hr', purpose: 'Guest' });

  const load = useCallback(async () => {
    try {
      const [lr, pr, ir, sr, gr, fr] = await Promise.all([
        VisitorLogService.getLogs().catch(() => ({data:{data:[]}})),
        VisitorLogService.getPending().catch(() => ({data:{data:[]}})),
        VisitorLogService.getInside().catch(() => ({data:{data:[]}})),
        GateSessionService.getMy().catch(() => ({data:{data:[]}})),
        GateService.getAll().catch(() => ({data:{data:[]}})),
        FlatService.getAll({ per_page: 200 }).catch(() => ({data:{data:[]}})),
      ]);
      setLogs(lr.data?.data?.items || lr.data?.data || []);
      setPending(pr.data?.data || []);
      setInside(ir.data?.data || []);
      const sessions = sr.data?.data || [];
      setSession(sessions.find((s: any) => !s.shift_end) || null);
      setGates(gr.data?.data?.items || gr.data?.data || []);
      setFlats(fr.data?.data?.items || fr.data?.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const startShift = async (gate_id: string) => {
    if (!gate_id) return;
    try { await GateSessionService.startShift(gate_id); load(); }
    catch (err: any) { Alert.alert('Error', 'Failed to start shift'); }
  };

  const endShift = async () => {
    try { await GateSessionService.endShift(); load(); }
    catch (err: any) { Alert.alert('Error', 'Failed'); }
  };

  const markEntry = async (id: string) => { try { await VisitorLogService.confirmEntry(id, {}); load(); } catch (err: any) { Alert.alert('Error', 'Failed'); } };
  const markExit = async (id: string) => { try { await VisitorLogService.confirmExit(id); load(); } catch (err: any) { Alert.alert('Error', 'Failed'); } };

  const registerVisitor = async () => {
    try {
      await VisitorLogService.create({ ...form, flat_id: parseInt(form.flat_id), entry_gate_id: session?.gate_id || gates[0]?.id });
      Alert.alert('Success', 'Visitor registered! Resident notified.');
      setForm({ entry_mode: 'foot', stay_duration: '1_2hr', purpose: 'Guest' });
      setCurrentTab('dashboard');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Registration failed');
    }
  };

  if (loading) return <LoadingScreen message="Loading guard dashboard..." />;

  const getFlatColor = (flatNumber: string) => {
    if (flatNumber.endsWith('A')) return '#60a5fa'; // Light Blue
    if (flatNumber.endsWith('B')) return '#4ade80'; // Light Green
    return T.text; // Default white
  };

  const renderContent = () => {
    if (currentTab === 'dashboard') return (
      <View>
        {!session && (
          <View style={{ backgroundColor: T.amberDim, padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <Text style={{ color: T.amber, fontWeight: '700' }}>⚠️ No active shift.</Text>
            <Select label="" placeholder="Select a gate to start shift..." value="" onChange={startShift} options={gates.map(g => ({value:g.id, label:g.name}))} />
          </View>
        )}
        
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <StatCard label="Pending" value={pending.length} color={T.amber} />
          <StatCard label="Inside" value={inside.length} color={T.green} />
        </View>

        {pending.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: T.amber, marginBottom: 12 }}>⏳ AWAITING APPROVAL</Text>
            {pending.map((log: any) => (
              <Card key={log.id} style={{ borderColor: T.amber+'55' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar name={log.visitor?.name||'V'} color={T.amber} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                    <Text style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Flat {log.flat?.flat_number} · {log.purpose}</Text>
                  </View>
                  {log.approval_status === 'approved' && (
                    <Btn variant="green" sm onClick={() => markEntry(log.id)}>✓ Entry</Btn>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 12 }}>RECENT LOGS</Text>
        {logs.slice(0, 10).map((log: any) => (
          <Card key={log.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={log.visitor?.name||'V'} size={40} color={log.status==='inside'||log.approval_status==='approved'?T.green:log.approval_status==='denied'?T.red:T.amber} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600', color: T.text, fontSize: 15, marginRight: 8 }}>{log.visitor?.name}</Text>
                  <Badge color={log.status==='inside'?'green':log.status==='denied'?'red':'amber'} small>{log.status}</Badge>
                </View>
                <Text style={{ color: T.muted, fontSize: 12 }}>Flat {log.flat?.flat_number} · {log.purpose}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {(log.status==='inside'||log.status==='overdue') && (
                  <Btn variant="ghost" sm onClick={() => markExit(log.id)}>Exit →</Btn>
                )}
              </View>
            </View>
          </Card>
        ))}
      </View>
    );

    if (currentTab === 'register') return (
      <View>
        <Card>
          <Input label="Visitor Name" placeholder="Full name" value={form.visitor_name} onChange={(v: string) => setForm({...form, visitor_name: v})} icon="👤" />
          <Input label="Phone Number" placeholder="98765 43210" value={form.visitor_phone} onChange={(v: string) => setForm({...form, visitor_phone: v})} icon="📞" />
          <Select label="Flat to Visit" value={form.flat_id} onChange={(v: string) => setForm({...form, flat_id: v})} options={flats.map(f=>({value:f.id.toString(), label:`Flat ${f.flat_number}`, color: getFlatColor(f.flat_number)}))} placeholder="Select flat" />
          <Select label="Purpose" value={form.purpose} onChange={(v: string) => setForm({...form, purpose: v})} options={['Guest','Delivery','Service','Other'].map(p=>({value:p,label:p}))} />
          <Select label="Entry Mode" value={form.entry_mode} onChange={(v: string) => setForm({...form, entry_mode: v})} options={[{value:'foot',label:'On Foot'},{value:'two_wheeler',label:'Two Wheeler'},{value:'four_wheeler',label:'Four Wheeler'}]} />
          {form.entry_mode !== 'foot' && <Input label="Vehicle Number" placeholder="KA01AB1234" value={form.vehicle_number} onChange={(v: string) => setForm({...form, vehicle_number: v})} icon="🚗" />}
          <Btn full onClick={registerVisitor} style={{ marginTop: 10 }}>Notify Resident →</Btn>
        </Card>
      </View>
    );

    if (currentTab === 'inside') return (
      <View>
        {inside.length === 0 && <EmptyState icon="🏘️" message="No visitors inside" />}
        {inside.map((log: any) => (
          <Card key={log.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={log.visitor?.name||'V'} size={44} color={log.status==='overdue'?T.red:T.green} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                <Text style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>Flat {log.flat?.flat_number} · {log.purpose}</Text>
              </View>
              <Btn variant={log.status==='overdue'?'red':'green'} sm onClick={() => markExit(log.id)}>Mark Exit</Btn>
            </View>
          </Card>
        ))}
      </View>
    );
    if (currentTab === 'qr') {
      const qrUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://vmsrm2.netlify.app';
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: T.text, marginBottom: 10, textAlign: 'center' }}>
            Self Check-In QR Code
          </Text>
          <Text style={{ color: T.muted, marginBottom: 30, textAlign: 'center' }}>
            Visitors can scan this code to open the check-in form on their phone.
          </Text>
          <View style={{ padding: 20, backgroundColor: 'white', borderRadius: 16 }}>
            <QRCode
              value={qrUrl}
              size={250}
              color="black"
              backgroundColor="white"
            />
          </View>
          <Text style={{ color: T.muted, marginTop: 20, textAlign: 'center' }}>
            Points to: {qrUrl}
          </Text>
        </View>
      );
    }

    if (currentTab === 'profile') return (
      <View>
        <Card style={{ alignItems: 'center', padding: 30 }}>
          <Avatar name={user?.name || '?'} size={80} />
          <Text style={{ color: T.text, fontSize: 24, fontWeight: '800', marginTop: 16 }}>{user?.name}</Text>
          <Text style={{ color: T.muted, fontSize: 16, marginTop: 4 }}>{user?.phone}</Text>
          {user?.role && <Badge color="blue" style={{ marginTop: 12 }}>{user?.role}</Badge>}
        </Card>
        <Btn variant="red" full onClick={logout} style={{ marginTop: 24 }}>Log Out</Btn>
      </View>
    );

  };

  return (
    <PageLayout title="Guard" subtitle={session ? `On Duty: ${session.gate?.name}` : "Off Duty"} action={session ? <Btn variant="red" sm onClick={endShift}>End Shift</Btn> : null}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -24, paddingHorizontal: 24 }}>
        <Tabs tabs={[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'register', label: 'Register Visitor' },
          { id: 'inside', label: 'Inside Now' },
          { id: 'qr', label: 'Check-In QR' },
          { id: 'profile', label: 'Profile' },
        ]} active={currentTab} onChange={setCurrentTab} />
      </ScrollView>

      {renderContent()}
    </PageLayout>
  );
}
