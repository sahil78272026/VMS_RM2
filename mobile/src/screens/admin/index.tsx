import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { T, Card, Btn, PageLayout, StatCard, EmptyState, LoadingScreen, Tabs, Avatar, Badge, Input, Select, Modal } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { UserService, FlatUserService, GuardService, FlatService } from '../../services';

export function AdminDashboard({ navigation }: any) {
  const { logout } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const [flats, setFlats] = useState<any[]>([]);
  const [guards, setGuards] = useState<any[]>([]);
  const [pendingResidents, setPendingResidents] = useState<any[]>([]);
  const [activeResidents, setActiveResidents] = useState<any[]>([]);
  
  const [modal, setModal] = useState<string|null>(null);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const [fr, gr, pr, ar] = await Promise.all([
        FlatService.getAll({ per_page: 500 }).catch(() => ({data:{data:[]}})),
        GuardService.getAll().catch(() => ({data:{data:[]}})),
        UserService.getAll({ role: 'resident', status: 'pending_verification' }).catch(() => ({data:{data:[]}})),
        UserService.getAll({ role: 'resident', status: 'active' }).catch(() => ({data:{data:[]}})),
      ]);
      setFlats(fr.data?.data?.items || fr.data?.data || []);
      setGuards(gr.data?.data?.items || gr.data?.data || []);
      setPendingResidents(pr.data?.data?.items || pr.data?.data || []);
      setActiveResidents(ar.data?.data?.items || ar.data?.data || []);
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
  };

  return (
    <PageLayout title="Admin" subtitle="Society Management" action={<Btn variant="ghost" sm onClick={logout}>Logout</Btn>}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -24, paddingHorizontal: 24 }}>
        <Tabs tabs={[
          { id: 'dashboard', label: 'Overview' },
          { id: 'residents', label: 'Residents' },
          { id: 'guards', label: 'Guards' },
        ]} active={currentTab} onChange={setCurrentTab} />
      </ScrollView>

      {renderContent()}

      {modal === 'add_guard' && (
        <Modal title="Register Guard" onClose={() => setModal(null)}>
          <Input label="Full Name *" placeholder="Guard Name" value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
          <Input label="Phone *" placeholder="Phone Number" value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} />
          <Input label="Employee ID *" placeholder="EMP-001" value={form.employee_id} onChange={(v: string) => setForm({...form, employee_id: v})} />
          <Input label="Password *" type="password" value={form.password} onChange={(v: string) => setForm({...form, password: v})} />
          <Select label="Shift" value={form.shift} onChange={(v: string) => setForm({...form, shift: v})} options={[{value:'morning',label:'Morning'},{value:'night',label:'Night'}]} />
          <Btn full variant="green" onClick={createGuard}>Create Guard</Btn>
        </Modal>
      )}
    </PageLayout>
  );
}
