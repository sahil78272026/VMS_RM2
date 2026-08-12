import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { T, Card, Btn, PageLayout, EmptyState, LoadingScreen, Modal, Badge, Input, Select } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { SocietyService, FlatService } from '../../services';

// ── Pattern Detection & Generation Helper ────────────────────────────────────
function analyzeAndGenerateFlats(sample: string, config: any): { type: string; title: string; desc: string; list: string[] } {
  const trimmed = (sample || '').trim();

  // 1. Slash Pattern: e.g. "67/6", "67/1", "1/1"
  const slashMatch = trimmed.match(/^(.*?)(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch || config.type === 'slash') {
    const prefix = config.prefix !== undefined ? config.prefix : (slashMatch ? slashMatch[1] : '');
    const startBase = parseInt(config.start_base || (slashMatch ? slashMatch[2] : '1')) || 1;
    const endBase = parseInt(config.end_base || String(startBase + 19)) || (startBase + 19);
    const unitsPerBase = parseInt(config.units_per_base || (slashMatch ? slashMatch[3] : '8')) || 8;

    const list: string[] = [];
    for (let b = startBase; b <= endBase; b++) {
      for (let u = 1; u <= unitsPerBase; u++) {
        list.push(`${prefix}${b}/${u}`);
      }
    }
    return {
      type: 'slash',
      title: 'Building / Flat Slash',
      desc: `Generates ${prefix}${startBase}/1 to ${prefix}${endBase}/${unitsPerBase}`,
      list,
    };
  }

  // 2. Lettered Sub-Flats: e.g. "1A", "67A"
  const subUnitMatch = trimmed.match(/^(\d+)([A-Za-z])$/);
  if (subUnitMatch || trimmed.includes('1A') || config.type === 'subunit') {
    const start = parseInt(config.start_num || (subUnitMatch ? subUnitMatch[1] : '1')) || 1;
    const end = parseInt(config.end_num || '50') || 50;
    const suffixes = (config.suffixes || 'None,A,B').split(',').map((s: string) => s.trim());

    const list: string[] = [];
    for (let i = start; i <= end; i++) {
      for (const s of suffixes) {
        if (!s || s.toLowerCase() === 'none') {
          list.push(String(i));
        } else {
          list.push(`${i}${s}`);
        }
      }
    }
    return {
      type: 'subunit',
      title: 'Partitioned Flats / Homes',
      desc: `Generates ${start} to ${end} with suffixes`,
      list,
    };
  }

  // 3. High-Rise Tower Pattern: e.g. "A-101", "T1-101"
  const towerMatch = trimmed.match(/^([A-Za-z0-9\s]+?)[-\s]+(\d)(\d{2})$/);
  if (towerMatch || (trimmed.includes('-') && /\d{3}/.test(trimmed)) || config.type === 'tower') {
    const prefix = config.prefix !== undefined ? config.prefix : (towerMatch ? `${towerMatch[1]}-` : 'A-');
    const floors = parseInt(config.floors || '20') || 20;
    const unitsPerFloor = parseInt(config.units_per_floor || '4') || 4;

    const list: string[] = [];
    for (let f = 1; f <= floors; f++) {
      for (let u = 1; u <= unitsPerFloor; u++) {
        const flatNumber = `${f}${u < 10 ? '0' : ''}${u}`;
        list.push(`${prefix}${flatNumber}`);
      }
    }
    return {
      type: 'tower',
      title: 'Tower High-Rise Grid',
      desc: `Generates ${prefix}101 through ${prefix}${floors}${unitsPerFloor < 10 ? '0' : ''}${unitsPerFloor}`,
      list,
    };
  }

  // 4. Plotted / Villa Community Pattern
  const plotMatch = trimmed.match(/^([A-Za-z\s]+)[-\s]*(\d+)$/);
  if (plotMatch || config.type === 'prefix') {
    const prefix = config.prefix !== undefined ? config.prefix : (plotMatch ? `${plotMatch[1].trim()} ` : 'Plot ');
    const start = parseInt(config.start_num || (plotMatch ? plotMatch[2] : '1')) || 1;
    const end = parseInt(config.end_num || '50') || 50;

    const list: string[] = [];
    for (let i = start; i <= end; i++) {
      list.push(`${prefix}${i}`);
    }
    return {
      type: 'prefix',
      title: 'Gated Plots / Villas',
      desc: `Generates ${prefix}${start} to ${prefix}${end}`,
      list,
    };
  }

  // 5. Default Sequential Range
  const start = parseInt(config.start_num || (/^\d+$/.test(trimmed) ? trimmed : '1')) || 1;
  const end = parseInt(config.end_num || String(start + 49)) || (start + 49);
  const prefix = config.prefix || '';

  const list: string[] = [];
  for (let i = start; i <= end; i++) {
    list.push(`${prefix}${i}`);
  }
  return {
    type: 'range',
    title: 'Sequential Range',
    desc: `Generates ${prefix}${start} to ${prefix}${end}`,
    list,
  };
}
export function SuperAdminScreen() {
  const { user, logout } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [selectedSoc, setSelectedSoc] = useState<any>(null);

  // Selected Society Detailed Stats & Admins
  const [socStats, setSocStats] = useState<any>(null);
  const [societyAdmins, setSocietyAdmins] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false);
  const [showAddAdmin, setShowAddAdmin] = useState<boolean>(false);
  const [adminForm, setAdminForm] = useState({ name: '', phone: '', email: '', flat_id: '' });
  const [societyFlats, setSocietyFlats] = useState<any[]>([]);
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  const [generatingFlats, setGeneratingFlats] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [showSuspendPrompt, setShowSuspendPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFlatsList, setShowFlatsList] = useState(false);

  // New Society Form
  const [form, setForm] = useState<any>({
    name: '',
    slug: '',
    address: '',
    city: 'Noida',
    pincode: '',
    sample_pattern: 'A-101',
    start_base: '67',
    end_base: '70',
    units_per_base: '6',
    start_num: '1',
    end_num: '150',
    prefix: 'A-',
    floors: '20',
    units_per_floor: '4',
    auto_generate: true,
  });

  // Batch Flats Form
  const [sampleInput, setSampleInput] = useState('1, 1A, 1B');
  const [patternConfig, setPatternConfig] = useState<any>({
    start_base: '1',
    end_base: '20',
    units_per_base: '8',
    start_num: '1',
    end_num: '150',
    prefix: 'A-',
    floors: '20',
    units_per_floor: '4',
    suffixes: 'None,A,B',
  });

  const generatedResult = useMemo(() => {
    return analyzeAndGenerateFlats(sampleInput, patternConfig);
  }, [sampleInput, patternConfig]);

  const load = useCallback(async () => {
    try {
      const resSoc = await SocietyService.getAll();
      setSocieties(resSoc.data?.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCreateSociety = async () => {
    if (!form.name || !form.slug) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Society name and identifier are required' });
    }

    try {
      const res = await SocietyService.create({
        name: form.name,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        total_flats: 0,
      });

      const newSociety = res.data?.data;

      Toast.show({ type: 'success', text1: 'Success', text2: `"${form.name}" onboarded successfully! Add flats from the Manage menu.` });
      setModal(null);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to onboard society' });
    }
  };

  const handleBatchFlats = async () => {
    if (!selectedSoc) return;
    if (generatedResult.list.length === 0) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'No flats to generate' });
    }

    setGeneratingFlats(true);
    try {
      await SocietyService.batchCreateFlats(selectedSoc.id, { flat_numbers: generatedResult.list });
      Toast.show({ type: 'success', text1: 'Success', text2: `Added ${generatedResult.list.length} flats to ${selectedSoc.name}` });
      setModal(null);
      load();
      if (selectedSoc?.id) {
        openSocietyOverview(selectedSoc);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to create flats' });
    } finally {
      setGeneratingFlats(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedSoc) return;
    try {
      await SocietyService.suspend(selectedSoc.id);
      Toast.show({ type: 'error', text1: 'Suspended', text2: `${selectedSoc.name} has been suspended.` });
      setShowSuspendPrompt(false);
      setModal(null);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to suspend society' });
    }
  };

  const handleActivate = async () => {
    if (!selectedSoc) return;
    try {
      await SocietyService.activate(selectedSoc.id);
      Toast.show({ type: 'success', text1: 'Activated', text2: `${selectedSoc.name} is now active.` });
      setModal(null);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to activate society' });
    }
  };

  const handleDelete = async () => {
    if (!selectedSoc) return;
    if (deleteConfirmation.trim() !== selectedSoc.name) {
      return Toast.show({ type: 'error', text1: 'Verification Failed', text2: `You must type exactly "${selectedSoc.name}" to delete.` });
    }
    try {
      await SocietyService.delete(selectedSoc.id);
      Toast.show({ type: 'success', text1: 'Deleted', text2: `${selectedSoc.name} and all associated data have been permanently destroyed.` });
      setShowDeletePrompt(false);
      setDeleteConfirmation('');
      setModal(null);
      load();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to delete society' });
    }
  };

  const openSocietyOverview = async (soc: any) => {
    setSelectedSoc(soc);
    setModal('overview');
    setLoadingOverview(true);
    setShowAddAdmin(false);
    setShowSuspendPrompt(false);
    setShowDeletePrompt(false);
    setShowFlatsList(false);
    setAdminForm({ name: '', phone: '', email: '', flat_id: '' });

    try {
      const [resStats, resAdmins, resFlats] = await Promise.all([
        SocietyService.getStats(soc.id),
        SocietyService.getAdmins(soc.id),
        FlatService.getAll({ per_page: 5000, society_id: soc.id }).catch(() => ({ data: { data: [] } })),
      ]);
      setSocStats(resStats.data?.data || null);
      setSocietyAdmins(resAdmins.data?.data || []);
      const frFlats = resFlats.data?.data?.items || resFlats.data?.data || [];
      frFlats.sort((a: any, b: any) => a.flat_number.localeCompare(b.flat_number, undefined, { numeric: true, sensitivity: 'base' }));
      setSocietyFlats(frFlats);
    } catch (err) {
      console.error('Failed to load society overview stats', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const handleInviteAdmin = async () => {
    if (!selectedSoc) return;
    if (!adminForm.phone || adminForm.phone.length < 10) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid 10-digit mobile number' });
    }
    if (!adminForm.name) {
      return Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter admin name' });
    }

    setSubmittingAdmin(true);
    try {
      await SocietyService.assignAdmin(selectedSoc.id, {
        name: adminForm.name.trim(),
        phone: adminForm.phone.trim(),
        email: adminForm.email.trim() || undefined,
        flat_id: adminForm.flat_id ? parseInt(adminForm.flat_id) : undefined,
      });
      Toast.show({ type: 'success', text1: 'Success', text2: `Admin ${adminForm.name} assigned! They can now log in via OTP.` });
      setAdminForm({ name: '', phone: '', email: '', flat_id: '' });
      setShowAddAdmin(false);
      const res = await SocietyService.getAdmins(selectedSoc.id);
      setSocietyAdmins(res.data?.data || []);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to assign admin' });
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (userId: number, adminName: string) => {
    if (!selectedSoc) return;
    Alert.alert('Remove Admin', `Remove ${adminName} as admin from ${selectedSoc.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await SocietyService.removeAdmin(selectedSoc.id, userId);
            const res = await SocietyService.getAdmins(selectedSoc.id);
            setSocietyAdmins(res.data?.data || []);
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to remove admin' });
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen message="Loading Platform..." />;

  const totalFlats = societies.reduce((sum, s) => sum + (s.total_flats || 0), 0);

  return (
    <PageLayout
      title="Platform Admin"
      subtitle="Uttar Pradesh Multi-Tenant Directory"
      onRefresh={handleRefresh}
      refreshing={refreshing}
      action={
        <Btn variant="green" sm onClick={() => setModal('create_society')}>
          + Add Society
        </Btn>
      }
    >
      {/* ── Sleek Stat Summary ────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, justifyContent: 'space-around', alignItems: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: T.accent, fontSize: 20, fontWeight: '800' }}>{societies.length}</Text>
          <Text style={{ color: T.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 }}>UP Communities</Text>
        </View>
        <View style={{ width: 1, height: 28, backgroundColor: T.border }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: T.green, fontSize: 20, fontWeight: '800' }}>{totalFlats}</Text>
          <Text style={{ color: T.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 }}>Total Flats</Text>
        </View>
      </View>

      <View style={{ marginBottom: 14 }}>
        <Input 
          placeholder="Search communities by name..."
          value={searchQuery}
          onChange={(v: string) => setSearchQuery(v)}
          icon="🔍"
        />
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: T.dim, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
        Communities ({societies.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length})
      </Text>

      {societies.length === 0 && (
        <EmptyState icon="🏢" message="No societies onboarded yet" sub="Tap '+ Add Society' to pick from the Uttar Pradesh Master Catalog." />
      )}

      {/* ── Clean Society Cards ───────────────────────────────────────────── */}
      {societies.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => (
        <Card
          key={s.id}
          onClick={() => openSocietyOverview(s)}
          style={{ marginBottom: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }} numberOfLines={1}>
                {s.name}
              </Text>
              {s.city && (
                <Badge color="blue" small>{s.city}</Badge>
              )}
              {s.status === 'suspended' ? (
                <Badge color="red" small>SUSPENDED</Badge>
              ) : (
                <Badge color="green" small>ACTIVE</Badge>
              )}
            </View>
            <Text style={{ color: T.muted, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
              📍 {s.address || s.city || 'Uttar Pradesh'}
            </Text>
            <Text style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>
              {s.total_flats || 0} Flats · <Text style={{ color: T.accent }}>{s.slug}</Text>
            </Text>
            {s.admins && s.admins.length > 0 && (
              <Text style={{ color: T.muted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                👤 {s.admins.map((a: any) => a.name).join(', ')}
              </Text>
            )}
          </View>

          {/* Quick Action Pill */}
          <Btn
            variant="outline"
            sm
            onClick={() => openSocietyOverview(s)}
          >
            Manage ⚙
          </Btn>
        </Card>
      ))}

      {/* Super Admin Info */}
      <View style={{ marginTop: 20, padding: 16, backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: T.text, fontSize: 13, fontWeight: '700' }}>Super Admin: {user?.name}</Text>
          <Text style={{ color: T.muted, fontSize: 11 }}>{user?.phone}</Text>
        </View>
        <Btn variant="ghost" sm onClick={logout}>Sign Out</Btn>
      </View>

      {/* ── Privacy-First Tenant Overview & Management Sheet ─────────────── */}
      {modal === 'overview' && selectedSoc && (
        <Modal
          title={selectedSoc.name}
          subtitle={`📍 ${selectedSoc.city || ''} · ${selectedSoc.slug}`}
          onClose={() => setModal(null)}
        >
          {loadingOverview ? (
            <ActivityIndicator color={T.accent} style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView style={{ maxHeight: 480 }}>
              {/* 1. Scale & Usage Aggregate Statistics */}
              <Text style={{ color: T.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                TENANT SCALE & HEALTH METRICS
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {/* Units */}
                <TouchableOpacity onPress={() => setShowFlatsList(!showFlatsList)} style={{ flex: 1, backgroundColor: T.surface2, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ fontSize: 11, color: T.muted, fontWeight: '600' }}>FLATS / HOMES</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: T.accent, marginTop: 2, textDecorationLine: 'underline' }}>
                    {socStats?.flats?.total || selectedSoc.total_flats || 0}
                  </Text>
                  <Text style={{ fontSize: 10, color: T.green, marginTop: 2 }}>
                    {socStats?.flats?.occupied || 0} Occ · {socStats?.flats?.vacant || 0} Vac
                  </Text>
                </TouchableOpacity>

                {/* Security */}
                <View style={{ flex: 1, backgroundColor: T.surface2, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ fontSize: 11, color: T.muted, fontWeight: '600' }}>SECURITY</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: T.accent, marginTop: 2 }}>
                    {socStats?.guards_count || 0} Guards
                  </Text>
                  <Text style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                    {socStats?.gates_count || 1} Active Gates
                  </Text>
                </View>

                {/* Visitors Activity */}
                <View style={{ flex: 1, backgroundColor: T.surface2, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ fontSize: 11, color: T.muted, fontWeight: '600' }}>VISITORS</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: T.amber, marginTop: 2 }}>
                    {socStats?.visitors?.today_total || 0}
                  </Text>
                  <Text style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                    {socStats?.visitors?.currently_inside || 0} Inside Now
                  </Text>
                </View>
              </View>

              {/* Show flats inline when count is clicked */}
              {showFlatsList && (
                <View style={{ backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: T.text, marginBottom: 8 }}>
                    Provisioned Flats ({societyFlats.length})
                  </Text>
                  {societyFlats.length === 0 ? (
                    <Text style={{ color: T.muted, fontSize: 12 }}>No flats have been added yet.</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {societyFlats.slice(0, 100).map((f) => (
                        <View key={f.id} style={{ backgroundColor: T.surface2, borderColor: T.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: T.text }}>{f.flat_number}</Text>
                        </View>
                      ))}
                      {societyFlats.length > 100 && (
                        <View style={{ backgroundColor: T.surface2, borderColor: T.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: T.muted }}>+ {societyFlats.length - 100} more</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* 2. RWA Society Admins Section */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: T.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  ASSIGNED RWA ADMINS ({societyAdmins.length})
                </Text>
                <TouchableOpacity onPress={() => setShowAddAdmin(!showAddAdmin)}>
                  <Text style={{ color: T.accent, fontSize: 12, fontWeight: '700' }}>
                    {showAddAdmin ? 'Cancel' : '+ Add Admin'}
                  </Text>
                </TouchableOpacity>
              </View>

              {societyAdmins.length === 0 ? (
                <View style={{ padding: 12, backgroundColor: '#FEF3C722', borderColor: '#F59E0B44', borderWidth: 1, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    ⚠️ No local RWA admin assigned yet. Assign an admin to manage daily operations.
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 12 }}>
                  {societyAdmins.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: T.surface2,
                        borderColor: T.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: T.text, fontWeight: '700', fontSize: 13 }}>
                          {item.user?.name || 'RWA Admin'}
                        </Text>
                        <Text style={{ color: T.accent, fontSize: 11, marginTop: 1 }}>
                          📱 {item.user?.phone} {item.user?.email ? `· ✉️ ${item.user.email}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveAdmin(item.user_id, item.user?.name || 'Admin')}
                        style={{ backgroundColor: '#EF444422', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Admin Form (Collapsible) */}
              {showAddAdmin && (
                <View style={{ backgroundColor: T.surface2, padding: 12, borderRadius: 8, borderColor: T.accent + '66', borderWidth: 1, marginBottom: 14 }}>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
                    + Provision RWA Admin
                  </Text>
                  <Input
                    label="Admin Full Name *"
                    placeholder="e.g. Rajesh Sharma"
                    value={adminForm.name}
                    onChange={(v: string) => setAdminForm({ ...adminForm, name: v })}
                  />
                  <Input
                    label="10-Digit Mobile Number (OTP Login) *"
                    placeholder="e.g. 9876543210"
                    keyboardType="number-pad"
                    maxLength={10}
                    value={adminForm.phone}
                    onChange={(v: string) => setAdminForm({ ...adminForm, phone: v.replace(/[^0-9]/g, '') })}
                  />
                  <Input
                    label="Email Address (Optional)"
                    placeholder="e.g. rajesh@society.com"
                    value={adminForm.email}
                    onChange={(v: string) => setAdminForm({ ...adminForm, email: v })}
                  />
                  {societyFlats.length > 0 && (
                    <Select
                      label="Assign to Flat (Optional)"
                      options={[
                        { label: '-- Select Flat (Optional) --', value: '' },
                        ...societyFlats.map(f => ({ label: f.flat_number, value: String(f.id) }))
                      ]}
                      value={adminForm.flat_id}
                      onChange={(v: string) => setAdminForm({ ...adminForm, flat_id: v })}
                    />
                  )}

                  <Btn
                    full
                    variant="green"
                    loading={submittingAdmin}
                    disabled={submittingAdmin}
                    onClick={handleInviteAdmin}
                    style={{ marginTop: 4 }}
                  >
                    Authorize Admin →
                  </Btn>
                </View>
              )}

              {/* 3. Flat Batch Generation Action */}
              <View style={{ marginTop: 8 }}>
                <Btn
                  variant="outline"
                  full
                  onClick={() => {
                    setSampleInput('A-101');
                    setModal('batch_flats');
                  }}
                >
                  ⚡ Generate / Add More Flats
                </Btn>
              </View>

              {/* 4. DANGER ZONE */}
              <View style={{ marginTop: 24, borderTopWidth: 1, borderColor: T.border, paddingTop: 16 }}>
                <Text style={{ color: T.red, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
                  DANGER ZONE (TENANT LIFECYCLE)
                </Text>

                {selectedSoc.status !== 'suspended' ? (
                  <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderColor: '#FECACA', borderWidth: 1 }}>
                    <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                      Suspend Tenant Access
                    </Text>
                    <Text style={{ color: '#B91C1C', fontSize: 11, marginBottom: 12 }}>
                      Immediately locks out all Guards, Residents, and Admins. Data is preserved safely.
                    </Text>
                    {!showSuspendPrompt ? (
                      <TouchableOpacity onPress={() => setShowSuspendPrompt(true)} style={{ backgroundColor: '#EF4444', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>⏸ Suspend {selectedSoc.name}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity onPress={() => setShowSuspendPrompt(false)} style={{ flex: 1, backgroundColor: '#FECACA', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSuspend} style={{ flex: 1, backgroundColor: '#991B1B', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Confirm Suspend</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 8, borderColor: '#A7F3D0', borderWidth: 1 }}>
                      <Text style={{ color: '#065F46', fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
                        Restore Tenant Access
                      </Text>
                      <TouchableOpacity onPress={handleActivate} style={{ backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>▶️ Reactivate Society</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderColor: '#EF4444', borderWidth: 2 }}>
                      <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '800', marginBottom: 6 }}>
                        Permanent Data Destruction
                      </Text>
                      <Text style={{ color: '#B91C1C', fontSize: 11, marginBottom: 12 }}>
                        Warning: This will irreversibly destroy ALL flats, logs, users, and gates tied to this society.
                      </Text>
                      
                      {!showDeletePrompt ? (
                        <TouchableOpacity onPress={() => setShowDeletePrompt(true)} style={{ backgroundColor: '#DC2626', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>🗑 Permanently Delete Data</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                            Type "{selectedSoc.name}" to confirm:
                          </Text>
                          <Input
                            placeholder={selectedSoc.name}
                            value={deleteConfirmation}
                            onChange={(v: string) => setDeleteConfirmation(v)}
                          />
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity onPress={() => { setShowDeletePrompt(false); setDeleteConfirmation(''); }} style={{ flex: 1, backgroundColor: '#FECACA', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                              <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={{ flex: 1, backgroundColor: '#991B1B', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}>
                              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Confirm Destroy</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </Modal>
      )}

      {/* ── Onboard New Society Modal ─────────────── */}
      {modal === 'create_society' && (
        <Modal title="Onboard Society" subtitle="Provision a new community" onClose={() => setModal(null)}>
          <View>
            <Input
              label="Society Name *"
              placeholder="e.g. Palm Heights"
              value={form.name}
              onChange={(v: string) => {
                const autoSlug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                setForm({ ...form, name: v, slug: autoSlug });
              }}
            />
            <Select
              label="City *"
              placeholder="-- Select City --"
              options={[
                { label: 'Noida', value: 'Noida' },
                { label: 'Greater Noida', value: 'Greater Noida' },
                { label: 'Ghaziabad', value: 'Ghaziabad' },
                { label: 'Lucknow', value: 'Lucknow' },
                { label: 'Kanpur', value: 'Kanpur' },
                { label: 'Agra', value: 'Agra' },
                { label: 'Varanasi', value: 'Varanasi' },
                { label: 'Prayagraj', value: 'Prayagraj' },
                { label: 'Meerut', value: 'Meerut' },
                { label: 'Other (UP)', value: 'Other' },
              ]}
              value={form.city}
              onChange={(v: string) => setForm({ ...form, city: v })}
            />
            <Input
              label="Pincode"
              placeholder="e.g. 201301"
              keyboardType="number-pad"
              value={form.pincode}
              onChange={(v: string) => setForm({ ...form, pincode: v.replace(/[^0-9]/g, '') })}
            />
            <Input
              label="Address"
              placeholder="e.g. Sector 78, Noida"
              value={form.address}
              onChange={(v: string) => setForm({ ...form, address: v })}
            />
          </View>

          <Btn
            full
            variant="green"
            disabled={!form.name || !form.slug}
            onClick={handleCreateSociety}
            style={{ marginTop: 6 }}
          >
            Provision {form.name || 'Society'} →
          </Btn>
        </Modal>
      )}

      {/* ── Auto Flat Pattern Generator Modal ────────────────────────────── */}
      {modal === 'batch_flats' && selectedSoc && (
        <Modal title="Flat Generator" subtitle={`For ${selectedSoc.name}`} onClose={() => setModal('overview')}>
          <Input
            label="Sample Flat Format *"
            placeholder="e.g. A-101, 1/1, 1A, Plot 1"
            value={sampleInput}
            onChange={(v: string) => setSampleInput(v)}
          />

          {/* Format Suggestions */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, marginTop: -4 }}>
            {[
              { label: 'Tower (T1-101)', val: 'T1-101, T1-102|' },
              { label: 'Block (A-101)', val: 'A-101, A-102|' },
              { label: 'Sub-Flats (1A)', val: '1A|' },
              { label: 'Numeric (101)', val: '101, 102|' },
              { label: 'Floor (1/1)', val: '1/1, 1/2|' },
              { label: 'Plots (Plot 1)', val: 'Plot 1, Plot 2|' }
            ].map(s => (
              <TouchableOpacity
                key={s.label}
                onPress={() => setSampleInput(s.val)}
                style={{ backgroundColor: T.surface2, borderColor: T.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
              >
                <Text style={{ fontSize: 11, color: T.text, fontWeight: '600' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Dynamic Configuration based on pattern type */}
          {generatedResult.type !== 'unknown' && (
            <View style={{ marginBottom: 4 }}>
              {generatedResult.type === 'tower' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Total Floors" value={patternConfig.floors} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, floors: v }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Flats per Floor" value={patternConfig.units_per_floor} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, units_per_floor: v }))} keyboardType="number-pad" />
                  </View>
                </View>
              )}

              {generatedResult.type === 'subunit' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Start Number" value={patternConfig.start_num} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, start_num: v }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="End Number" value={patternConfig.end_num} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, end_num: v }))} keyboardType="number-pad" />
                  </View>
                </View>
              )}

              {generatedResult.type === 'slash' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Start Block" value={patternConfig.start_base} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, start_base: v }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="End Block" value={patternConfig.end_base} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, end_base: v }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Flats/Block" value={patternConfig.units_per_base} onChange={(v: string) => setPatternConfig((p: any) => ({ ...p, units_per_base: v }))} keyboardType="number-pad" />
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{ backgroundColor: T.surface2, borderColor: T.accent + '44', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: T.accent, fontWeight: '700', fontSize: 12 }}>{generatedResult.title}</Text>
              <Badge color="blue" small>{generatedResult.list.length} Flats</Badge>
            </View>
            <Text style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{generatedResult.desc}</Text>
          </View>

          {/* Live Preview */}
          <Text style={{ color: T.text, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            Preview (First 8 flats):
          </Text>
          <View style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 }}>
            <Text style={{ color: T.green, fontSize: 12, fontFamily: 'monospace' }}>
              {generatedResult.list.slice(0, 8).join(', ')}
              {generatedResult.list.length > 8 ? ` ... (+${generatedResult.list.length - 8} more)` : ''}
            </Text>
          </View>

          <Btn full variant="green" onClick={handleBatchFlats} disabled={generatingFlats} loading={generatingFlats}>
            {generatingFlats ? `Generating...` : `Generate & Save ${generatedResult.list.length} Flats →`}
          </Btn>
        </Modal>
      )}
    </PageLayout>
  );
}
