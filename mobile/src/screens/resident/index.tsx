import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, TouchableOpacity, ScrollView, Image } from 'react-native';
import { VisitorLogService, PreApprovalService, FrequentPassService, MaintenanceService, AnnouncementService, FlatUserService } from '../../services';
import { T, Card, Badge, Avatar, Btn, Input, Select, PageLayout, StatCard, EmptyState, LoadingScreen, Modal, Tabs } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';

export function ResidentDashboard({ route }: any) {
  const { logout } = useAuth();
  const [currentTab, setCurrentTab] = useState(route?.params?.tab || 'dashboard');

  const [pending, setPending] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [preApprovals, setPreApprovals] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const load = useCallback(async () => {
    try {
      const [pr, lr, br, mr, ar, par, fpr] = await Promise.all([
        VisitorLogService.getMyPending().catch(() => ({data:{data:[]}})),
        VisitorLogService.getMyLogs({per_page:20}).catch(() => ({data:{data:[]}})),
        MaintenanceService.getMy().catch(() => ({data:{data:[]}})),
        FlatUserService.getMyFlat().catch(() => ({data:{data:[]}})),
        AnnouncementService.getAll().catch(() => ({data:{data:[]}})),
        PreApprovalService.getMy().catch(() => ({data:{data:[]}})),
        FrequentPassService.getMy().catch(() => ({data:{data:[]}})),
      ]);
      setPending(pr.data?.data || []);
      setLogs(lr.data?.data?.items || lr.data?.data || []);
      setBills(br.data?.data || []);
      setMembers(mr.data?.data || []);
      setAnnouncements(ar.data?.data?.items || ar.data?.data || []);
      setPreApprovals(par.data?.data || []);
      setPasses(fpr.data?.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const approve = async (id: string) => { try { await VisitorLogService.approve(id); load(); } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } };
  const deny = async (id: string) => { try { await VisitorLogService.deny(id); load(); } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } };
  const confirmDepart = async (id: string) => { try { await VisitorLogService.confirmDeparture(id); load(); } catch (err: any) { Alert.alert('Error', err.response?.data?.message||'Failed'); } };
  const payBill = async () => { try { await MaintenanceService.pay(modal.id, { payment_mode: form.payment_mode || 'upi', amount_paid: modal.amount }); setModal(null); load(); Alert.alert('Success', 'Payment recorded'); } catch (err: any) { Alert.alert('Error', 'Failed to pay'); } };
  const createPre = async () => { try { await PreApprovalService.create(form); setModal(null); load(); } catch (err: any) { Alert.alert('Error', 'Failed'); } };
  const cancelPre = async (id: string) => { try { await PreApprovalService.cancel(id); load(); } catch (err: any) { Alert.alert('Error', 'Failed'); } };

  if (loading) return <LoadingScreen message="Loading dashboard..." />;

  const renderContent = () => {
    if (currentTab === 'dashboard') return (
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
          <StatCard label="Pending" value={pending.length} color={pending.length>0?T.amber:T.green} />
          <StatCard label="Unpaid" value={bills.filter(b=>b.status!=='paid').length} color={T.red} />
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

    if (currentTab === 'bills') return (
      <View>
        {bills.length === 0 && <EmptyState icon="💰" message="No bills" />}
        {bills.map((b: any) => (
          <Card key={b.id} style={{ borderColor: b.status==='overdue'?T.red+'44':T.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: T.text, fontSize: 16 }}>{b.bill_period}</Text>
                <Text style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>Due: {new Date(b.due_date).toLocaleDateString()} · ₹{b.amount}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge color={b.status==='paid'?'green':b.status==='overdue'?'red':'amber'} small>{b.status}</Badge>
                {b.status !== 'paid' && <Btn variant="green" sm onClick={() => { setForm({}); setModal({ type: 'pay', ...b }); }} style={{ marginTop: 8 }}>Pay Now</Btn>}
              </View>
            </View>
          </Card>
        ))}
      </View>
    );

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
  };

  return (
    <PageLayout title="Resident" subtitle="RM2 Residency" action={<Btn variant="ghost" sm onClick={logout}>Logout</Btn>}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginHorizontal: -24, paddingHorizontal: 24 }}>
        <Tabs tabs={[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'passes', label: 'Passes' },
          { id: 'history', label: 'History' },
          { id: 'bills', label: 'Bills' },
          { id: 'notices', label: 'Notices' },
        ]} active={currentTab} onChange={setCurrentTab} />
      </ScrollView>

      {renderContent()}

      {modal?.type === 'pay' && (
        <Modal title={`Pay ${modal.bill_period}`} subtitle={`Amount: ₹${modal.amount}`} onClose={() => setModal(null)}>
          <Select label="Payment Mode" value={form.payment_mode} onChange={(v: string) => setForm({...form, payment_mode: v})} options={[{value:'upi',label:'UPI'},{value:'card',label:'Card'},{value:'cash',label:'Cash'}]} />
          <Btn full variant="green" onClick={payBill}>Confirm Payment</Btn>
        </Modal>
      )}

      {modal?.type === 'pre' && (
        <Modal title="Pre-Approve Guest" onClose={() => setModal(null)}>
          <Input label="Guest Name" placeholder="Full name" value={form.visitor_name} onChange={(v: string) => setForm({...form, visitor_name: v})} />
          <Input label="Guest Phone" placeholder="Phone number" value={form.visitor_phone} onChange={(v: string) => setForm({...form, visitor_phone: v})} />
          <Input label="Purpose" placeholder="E.g. Party" value={form.purpose} onChange={(v: string) => setForm({...form, purpose: v})} />
          <Input label="Valid Until (YYYY-MM-DD)" placeholder="2026-12-31" value={form.valid_until} onChange={(v: string) => setForm({...form, valid_until: v})} />
          <Btn full onClick={createPre}>Save Pre-Approval</Btn>
        </Modal>
      )}
    </PageLayout>
  );
}
