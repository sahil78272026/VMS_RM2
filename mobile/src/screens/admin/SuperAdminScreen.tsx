import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { T, Card, Btn, PageLayout, StatCard, EmptyState, LoadingScreen, Modal, Badge, Input, Select } from '../../components/UI';
import { useAuth } from '../../context/AuthContext';
import { SocietyService } from '../../services';

// ── Pattern Detection & Generation Helper ────────────────────────────────────
function analyzeAndGenerateFlats(sample: string, config: any): { type: string; title: string; desc: string; list: string[] } {
  const trimmed = sample.trim();

  // 1. Slash Pattern: e.g. "67/6", "67/1", "B-12/4", "Tower1/201"
  const slashMatch = trimmed.match(/^(.*?)(\d+)\s*\/\s*(\d+)$/);
  if (slashMatch || config.type === 'slash') {
    const prefix = config.prefix !== undefined ? config.prefix : (slashMatch ? slashMatch[1] : '');
    const startBase = parseInt(config.start_base || (slashMatch ? slashMatch[2] : '67')) || 67;
    const endBase = parseInt(config.end_base || String(startBase + 3)) || (startBase + 3);
    const unitsPerBase = parseInt(config.units_per_base || (slashMatch ? slashMatch[3] : '6')) || 6;

    const list: string[] = [];
    for (let b = startBase; b <= endBase; b++) {
      for (let u = 1; u <= unitsPerBase; u++) {
        list.push(`${prefix}${b}/${u}`);
      }
    }
    return {
      type: 'slash',
      title: '🏢 Building / Unit Slash Format',
      desc: `Generates ${prefix}{Building}/{Unit} (e.g. ${prefix}${startBase}/1 to ${prefix}${endBase}/${unitsPerBase})`,
      list,
    };
  }

  // 2. Lettered Sub-Unit Pattern: e.g. "1A", "67A", "1, 1A, 1B"
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
      title: '🏢 RM2 Partitioned Sub-Units',
      desc: `Generates partitioned units (e.g. ${start}, ${start}A, ${start}B up to ${end}B)`,
      list,
    };
  }

  // 3. High-Rise Tower Pattern: e.g. "A-101", "T1-101", "Tower A-201"
  const towerMatch = trimmed.match(/^([A-Za-z0-9\s]+?)[-\s]+(\d)(\d{2})$/);
  if (towerMatch || (trimmed.includes('-') && /\d{3}/.test(trimmed)) || config.type === 'tower') {
    const prefix = config.prefix !== undefined ? config.prefix : (towerMatch ? `${towerMatch[1]}-` : 'A-');
    const floors = parseInt(config.floors || '10') || 10;
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
      title: '🏙️ Tower High-Rise Grid',
      desc: `Generates ${prefix}{Floor}{Unit} (e.g. ${prefix}101 to ${prefix}${floors}${unitsPerFloor < 10 ? '0' : ''}${unitsPerFloor})`,
      list,
    };
  }

  // 4. Plotted / Villa Community Pattern: e.g. "Plot 1", "Villa 101", "RowHouse-5"
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
      title: '🏡 Gated Plots / Villa Pattern',
      desc: `Generates ${prefix}{Number} (e.g. ${prefix}${start} to ${prefix}${end})`,
      list,
    };
  }

  // 5. Default: Pure Sequential Number Range
  const start = parseInt(config.start_num || (/^\d+$/.test(trimmed) ? trimmed : '101')) || 101;
  const end = parseInt(config.end_num || String(start + 49)) || (start + 49);
  const prefix = config.prefix || '';

  const list: string[] = [];
  for (let i = start; i <= end; i++) {
    list.push(`${prefix}${i}`);
  }
  return {
    type: 'range',
    title: '🔢 Sequential Range',
    desc: `Generates sequence ${prefix}${start} through ${prefix}${end}`,
    list,
  };
}

export function SuperAdminScreen({ navigation }: any) {
  const { user, logout, switchSociety } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [selectedSoc, setSelectedSoc] = useState<any>(null);

  // New Society Form
  const [form, setForm] = useState<any>({
    name: '',
    slug: '',
    address: '',
    city: '',
    sample_pattern: '67/1',
    start_base: '67',
    end_base: '70',
    units_per_base: '6',
    auto_generate: true,
  });

  // Batch Flats Form
  const [sampleInput, setSampleInput] = useState('67/1');
  const [patternConfig, setPatternConfig] = useState<any>({
    start_base: '67',
    end_base: '70',
    units_per_base: '6',
    start_num: '101',
    end_num: '150',
    prefix: '',
    floors: '10',
    units_per_floor: '4',
    suffixes: 'None,A,B',
  });

  // Compute live pattern output
  const generatedResult = useMemo(() => {
    return analyzeAndGenerateFlats(sampleInput, patternConfig);
  }, [sampleInput, patternConfig]);

  const load = useCallback(async () => {
    try {
      const res = await SocietyService.getAll();
      setSocieties(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load societies', err);
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

  const applyHint = (hintSample: string, customConfig: any = {}) => {
    setSampleInput(hintSample);
    setPatternConfig((prev: any) => ({ ...prev, ...customConfig }));
  };

  const handleCreateSociety = async () => {
    if (!form.name || !form.slug) {
      return Alert.alert('Error', 'Society Name and Identifier (slug) are required');
    }

    try {
      // 1. Generate flats if auto_generate is on
      const flatData = analyzeAndGenerateFlats(form.sample_pattern || '67/1', {
        start_base: form.start_base,
        end_base: form.end_base,
        units_per_base: form.units_per_base,
        start_num: form.start_num,
        end_num: form.end_num,
        prefix: form.prefix,
      });

      const totalFlats = flatData.list.length || 50;

      const res = await SocietyService.create({
        name: form.name,
        slug: form.slug.toLowerCase().replace(/\s+/g, '-'),
        address: form.address,
        city: form.city,
        total_flats: totalFlats,
      });

      const newSociety = res.data?.data;

      // 2. Batch create generated flats
      if (newSociety?.id && flatData.list.length > 0) {
        await SocietyService.batchCreateFlats(newSociety.id, { flat_numbers: flatData.list });
      }

      Alert.alert('Success', `Society "${form.name}" created with ${flatData.list.length} flats automatically provisioned!`);
      setModal(null);
      setForm({ name: '', slug: '', address: '', city: '', sample_pattern: '67/1', start_base: '67', end_base: '70', units_per_base: '6', auto_generate: true });
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create society');
    }
  };

  const handleBatchFlats = async () => {
    if (!selectedSoc) return;
    if (generatedResult.list.length === 0) {
      return Alert.alert('Error', 'No flats to generate. Please check pattern parameters.');
    }

    try {
      await SocietyService.batchCreateFlats(selectedSoc.id, { flat_numbers: generatedResult.list });
      Alert.alert('Success', `Created ${generatedResult.list.length} flats in ${selectedSoc.name}!`);
      setModal(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to batch create flats');
    }
  };

  const handleSwitchToSociety = async (soc: any) => {
    try {
      await switchSociety(soc.id);
      Alert.alert('Active Context Changed', `Switched active society to "${soc.name}"`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to switch context');
    }
  };

  if (loading) return <LoadingScreen message="Loading Platform Management..." />;

  const totalFlats = societies.reduce((sum, s) => sum + (s.total_flats || 0), 0);

  return (
    <PageLayout
      title="Platform Admin"
      subtitle="Multi-Tenant Society Directory & Flat Provisioning"
      onRefresh={handleRefresh}
      refreshing={refreshing}
      action={
        <Btn variant="green" sm onClick={() => setModal('create_society')}>
          + New Society
        </Btn>
      }
    >
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <StatCard label="Societies" value={societies.length} color={T.accent} />
        <StatCard label="Total Units" value={totalFlats} color={T.green} />
      </View>

      <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 12 }}>
        ACTIVE COMMUNITIES ({societies.length})
      </Text>

      {societies.length === 0 && (
        <EmptyState icon="🏢" message="No societies onboarded yet" sub="Create your first community using the button above." />
      )}

      {societies.map((s) => (
        <Card key={s.id} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: T.text }}>{s.name}</Text>
                <Badge color={s.status === 'active' ? 'green' : 'amber'} small style={{ marginLeft: 8 }}>
                  {s.status}
                </Badge>
              </View>
              <Text style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
                📍 {s.city ? `${s.city}, ` : ''}{s.address || 'Address not specified'}
              </Text>
              <Text style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
                Identifier: <Text style={{ color: T.accent }}>{s.slug}</Text> · {s.total_flats || 0} Capacity
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <Btn
              variant="outline"
              sm
              style={{ flex: 1 }}
              onClick={() => handleSwitchToSociety(s)}
            >
              🏢 Switch Scope
            </Btn>
            <Btn
              variant="ghost"
              sm
              style={{ flex: 1 }}
              onClick={() => {
                setSelectedSoc(s);
                setSampleInput('67/1');
                setModal('batch_flats');
              }}
            >
              ⚡ Auto Flats Generator
            </Btn>
          </View>
        </Card>
      ))}

      <Card style={{ marginTop: 24, padding: 20 }}>
        <Text style={{ color: T.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Super Admin Account</Text>
        <Text style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>Logged in as {user?.name} ({user?.phone})</Text>
        <Btn variant="red" full onClick={logout}>Log Out</Btn>
      </Card>

      {/* ── Onboard New Society Modal ────────────────────────────────────── */}
      {modal === 'create_society' && (
        <Modal title="Onboard New Society" subtitle="Provision a new community tenant" onClose={() => setModal(null)}>
          <Input
            label="Society Name *"
            placeholder="e.g. Palm Heights"
            value={form.name}
            onChange={(v: string) => {
              const autoSlug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
              setForm({ ...form, name: v, slug: autoSlug });
            }}
          />
          <Input
            label="Unique Slug Identifier *"
            placeholder="e.g. palm-heights"
            value={form.slug}
            onChange={(v: string) => setForm({ ...form, slug: v })}
          />
          <Input
            label="City"
            placeholder="e.g. Gurgaon"
            value={form.city}
            onChange={(v: string) => setForm({ ...form, city: v })}
          />
          <Input
            label="Full Address"
            placeholder="e.g. Sector 54, Golf Course Road"
            value={form.address}
            onChange={(v: string) => setForm({ ...form, address: v })}
          />

          {/* Pattern Detection for Initial Flats */}
          <Text style={{ color: T.accent, fontWeight: '700', fontSize: 13, marginTop: 12, marginBottom: 6, textTransform: 'uppercase' }}>
            ⚡ Sample Flat Pattern (Auto Detected)
          </Text>
          <Input
            placeholder="e.g. 67/1, 1A, A-101, Plot 1, 101"
            value={form.sample_pattern}
            onChange={(v: string) => setForm({ ...form, sample_pattern: v })}
          />

          {/* Quick Pattern Preset Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, marginHorizontal: -4 }}>
            {[
              { label: '🏢 67/1 Slash', sample: '67/1', conf: { start_base: '67', end_base: '70', units_per_base: '6' } },
              { label: '🏢 1, 1A, 1B Sub-units', sample: '1A', conf: { start_num: '1', end_num: '50', suffixes: 'None,A,B' } },
              { label: '🏙️ A-101 Tower', sample: 'A-101', conf: { prefix: 'A-', floors: '10', units_per_floor: '4' } },
              { label: '🏡 Plot 1 Gated', sample: 'Plot 1', conf: { prefix: 'Plot ', start_num: '1', end_num: '50' } },
            ].map((h, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setForm({ ...form, sample_pattern: h.sample, ...h.conf })}
                style={{
                  backgroundColor: form.sample_pattern === h.sample ? T.accentDim : T.surface2,
                  borderColor: form.sample_pattern === h.sample ? T.accent : T.border,
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginHorizontal: 4,
                }}
              >
                <Text style={{ color: form.sample_pattern === h.sample ? T.accent : T.muted, fontSize: 12, fontWeight: '600' }}>
                  {h.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Btn full variant="green" onClick={handleCreateSociety} style={{ marginTop: 12 }}>
            Provision Community Tenant →
          </Btn>
        </Modal>
      )}

      {/* ── Auto Pattern Flat Generator Modal ────────────────────────────── */}
      {modal === 'batch_flats' && selectedSoc && (
        <Modal title={`Auto Flat Pattern Generator`} subtitle={`For ${selectedSoc.name}`} onClose={() => setModal(null)}>
          <Text style={{ color: T.muted, fontSize: 13, marginBottom: 8 }}>
            Type any sample flat number below. The engine will detect the numbering schema and generate all units automatically:
          </Text>

          {/* Quick Pattern Preset Chips */}
          <Text style={{ color: T.dim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>
            Quick Pattern Hints (Tap to Auto-Fill):
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {[
              { label: '🏢 67/1 (Slash)', sample: '67/1', conf: { start_base: '67', end_base: '70', units_per_base: '6' } },
              { label: '🏢 1, 1A, 1B (Sub-Units)', sample: '1A', conf: { start_num: '1', end_num: '50', suffixes: 'None,A,B' } },
              { label: '🏙️ A-101 (Tower)', sample: 'A-101', conf: { prefix: 'A-', floors: '10', units_per_floor: '4' } },
              { label: '🏡 Plot 1 (Gated)', sample: 'Plot 1', conf: { prefix: 'Plot ', start_num: '1', end_num: '50' } },
              { label: '🔢 101-150 (Numeric)', sample: '101', conf: { start_num: '101', end_num: '150', prefix: '' } },
            ].map((h, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => applyHint(h.sample, h.conf)}
                style={{
                  backgroundColor: sampleInput === h.sample ? T.accentDim : T.surface2,
                  borderColor: sampleInput === h.sample ? T.accent : T.border,
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: sampleInput === h.sample ? T.accent : T.text, fontSize: 12, fontWeight: '600' }}>
                  {h.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="Sample Flat Format *"
            placeholder="e.g. 67/1, 1A, A-101, Plot 1, 101"
            value={sampleInput}
            onChange={(v: string) => setSampleInput(v)}
          />

          {/* Detected Pattern Notification Card */}
          <Card style={{ backgroundColor: T.surface2, borderColor: T.accent + '44', padding: 12, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: T.accent, fontWeight: '800', fontSize: 13 }}>{generatedResult.title}</Text>
              <Badge color="blue" small>{generatedResult.list.length} Flats</Badge>
            </View>
            <Text style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>{generatedResult.desc}</Text>
          </Card>

          {/* Dynamic Configuration Controls based on Pattern Type */}
          {generatedResult.type === 'slash' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Start Bldg"
                  placeholder="67"
                  value={patternConfig.start_base}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, start_base: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="End Bldg"
                  placeholder="70"
                  value={patternConfig.end_base}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, end_base: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Units/Bldg"
                  placeholder="6"
                  value={patternConfig.units_per_base}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, units_per_base: v })}
                />
              </View>
            </View>
          )}

          {generatedResult.type === 'subunit' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Start Number"
                  placeholder="1"
                  value={patternConfig.start_num}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, start_num: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="End Number"
                  placeholder="50"
                  value={patternConfig.end_num}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, end_num: v })}
                />
              </View>
            </View>
          )}

          {generatedResult.type === 'tower' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Tower Prefix"
                  placeholder="A-"
                  value={patternConfig.prefix}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, prefix: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Total Floors"
                  placeholder="10"
                  value={patternConfig.floors}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, floors: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Units/Floor"
                  placeholder="4"
                  value={patternConfig.units_per_floor}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, units_per_floor: v })}
                />
              </View>
            </View>
          )}

          {(generatedResult.type === 'prefix' || generatedResult.type === 'range') && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Start #"
                  placeholder="101"
                  value={patternConfig.start_num}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, start_num: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="End #"
                  placeholder="150"
                  value={patternConfig.end_num}
                  onChange={(v: string) => setPatternConfig({ ...patternConfig, end_num: v })}
                />
              </View>
            </View>
          )}

          {/* Live Preview List */}
          <Text style={{ color: T.text, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 }}>
            Live Preview (First 8 generated units):
          </Text>
          <View style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: T.green, fontSize: 13, fontFamily: 'monospace' }}>
              {generatedResult.list.slice(0, 8).join(', ')}
              {generatedResult.list.length > 8 ? ` ... (+${generatedResult.list.length - 8} more)` : ''}
            </Text>
          </View>

          <Btn full variant="green" onClick={handleBatchFlats}>
            Generate & Insert {generatedResult.list.length} Flats to DB →
          </Btn>
        </Modal>
      )}
    </PageLayout>
  );
}
