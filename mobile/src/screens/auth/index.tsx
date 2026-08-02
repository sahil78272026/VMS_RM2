import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { T, Card, Btn, Input, PageLayout, Badge, Modal } from '../../components/UI';
import { AuthService, FlatService, SocietyService } from '../../services';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

// ── Google SSO Button Component ──────────────────────────────────────────────
export function GoogleSSOButton({ onClick, loading, label = 'Continue with Google' }: any) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onClick}
      disabled={loading}
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#1e293b" style={{ marginRight: 8 }} />
      ) : (
        <View style={{ width: 20, height: 20, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#4285F4' }}>G</Text>
        </View>
      )}
      <Text style={{ color: '#1E293B', fontWeight: '700', fontSize: 15 }}>
        {loading ? 'Signing in with Google...' : label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Landing Screen ───────────────────────────────────────────────────────────
export function LandingScreen({ navigation }: any) {
  const { loginWithGoogle } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleModal, setGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const SLIDES = [
    {
      icon: '🛡️',
      title: 'Smart Gate Security',
      desc: 'Seamless 1-tap pre-approvals for guests, cabs, delivery, and home services.',
      color: T.accent,
    },
    {
      icon: '⚡',
      title: 'Real-Time Gate Alerts',
      desc: 'Get instant notifications with visitor photos before they enter the society.',
      color: T.green,
    },
    {
      icon: '🏢',
      title: 'Multi-Society Access',
      desc: 'Manage multiple apartments across different societies from a single account.',
      color: '#A78BFA',
    },
  ];

  const handleGoogleSignIn = async () => {
    if (!googleEmail || !googleEmail.includes('@')) {
      return Alert.alert('Error', 'Please enter a valid Google email address.');
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle({
        email: googleEmail.trim(),
        name: googleName.trim() || googleEmail.split('@')[0],
        google_id: `g_${Date.now()}`,
      });
      setGoogleModal(false);
    } catch (err: any) {
      Alert.alert('Google Sign-In Failed', err.response?.data?.message || 'Unable to authenticate with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 24 }}>
      {/* Top Branding */}
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          backgroundColor: T.surface2,
          borderColor: T.accent + '44',
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          shadowColor: T.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        }}>
          <Text style={{ fontSize: 34 }}>🏢</Text>
        </View>
        <Text style={{ fontSize: 30, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
          RM2 <Text style={{ color: T.accent }}>Secure</Text>
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Badge color="blue" small>COMMUNITY GATEWAY</Badge>
        </View>
      </View>

      {/* Feature Carousel Cards */}
      <View style={{ marginVertical: 14 }}>
        <Card style={{
          padding: 22,
          alignItems: 'center',
          borderColor: SLIDES[activeSlide].color + '44',
          backgroundColor: T.surface,
          borderRadius: 20,
          borderWidth: 1.5,
        }}>
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: SLIDES[activeSlide].color + '18',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ fontSize: 28 }}>{SLIDES[activeSlide].icon}</Text>
          </View>
          <Text style={{ fontSize: 19, fontWeight: '800', color: T.text, marginBottom: 6, textAlign: 'center' }}>
            {SLIDES[activeSlide].title}
          </Text>
          <Text style={{ fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 18 }}>
            {SLIDES[activeSlide].desc}
          </Text>
        </Card>

        {/* Carousel Indicators */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14, gap: 8 }}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveSlide(i)}
              style={{
                width: activeSlide === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: activeSlide === i ? T.accent : T.border,
              }}
            />
          ))}
        </View>
      </View>

      {/* Action Buttons (Google SSO + Standard Login) */}
      <View>
        {/* Google SSO Button */}
        <GoogleSSOButton onClick={() => setGoogleModal(true)} />

        <Btn
          full
          onClick={() => navigation.navigate('Login', { role: 'resident' })}
          style={{ marginBottom: 10, paddingVertical: 13, borderRadius: 14 }}
        >
          Sign In with Phone →
        </Btn>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{
            backgroundColor: T.surface2,
            borderColor: T.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>
            🏢 Join Your Society / Register Flat
          </Text>
        </TouchableOpacity>

        {/* Guard / Staff Login Link */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: T.dim, fontSize: 12 }}>Security Guard? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role: 'guard' })}>
            <Text style={{ color: T.accent, fontWeight: '700', fontSize: 12 }}>Guard Portal 🛡️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Google SSO Prompt Modal */}
      {googleModal && (
        <Modal title="Google Account Sign-In" subtitle="One-tap secure resident access" onClose={() => setGoogleModal(false)}>
          <Text style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>
            Enter your Google email to authenticate and access your society portal instantly:
          </Text>
          <Input
            label="Google Email Address *"
            placeholder="e.g. resident@gmail.com"
            value={googleEmail}
            onChange={setGoogleEmail}
            icon="✉️"
          />
          <Input
            label="Full Name (Optional)"
            placeholder="e.g. Rahul Sharma"
            value={googleName}
            onChange={setGoogleName}
            icon="👤"
          />
          <Btn full variant="green" disabled={googleLoading} onClick={handleGoogleSignIn} style={{ marginTop: 12 }}>
            {googleLoading ? 'Connecting...' : 'Sign In with Google Account →'}
          </Btn>
        </Modal>
      )}
    </View>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────────────
export function LoginScreen({ route, navigation }: any) {
  const initialRole = route.params?.role || 'resident';
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const { login, loginWithGoogle } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [googleModal, setGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const ROLES = [
    { id: 'resident', label: 'Resident', icon: '🏠' },
    { id: 'guard', label: 'Guard', icon: '🛡️' },
    { id: 'admin', label: 'Admin', icon: '⚙️' },
  ];

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!phone || !password) {
      setErrorMsg('Please enter both registered phone number and password.');
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error?.details || 'Invalid credentials. Please verify your phone and password.';
      setErrorMsg(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleEmail || !googleEmail.includes('@')) {
      return Alert.alert('Error', 'Please enter a valid Google email address.');
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle({
        email: googleEmail.trim(),
        name: googleName.trim() || googleEmail.split('@')[0],
        google_id: `g_${Date.now()}`,
      });
      setGoogleModal(false);
    } catch (err: any) {
      Alert.alert('Google Sign-In Failed', err.response?.data?.message || 'Unable to authenticate with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <PageLayout title="Sign In" subtitle="Access your society management portal" scroll={true}>
      {/* Role Switcher Pill Bar */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: T.surface2,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        borderColor: T.border,
        borderWidth: 1,
      }}>
        {ROLES.map((r) => {
          const isSel = selectedRole === r.id;
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => {
                setSelectedRole(r.id);
                setErrorMsg(null);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: isSel ? T.accentDim : 'transparent',
                borderColor: isSel ? T.accent + '66' : 'transparent',
                borderWidth: isSel ? 1 : 0,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 14 }}>{r.icon}</Text>
              <Text style={{
                color: isSel ? T.accent : T.muted,
                fontWeight: isSel ? '700' : '500',
                fontSize: 13,
              }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Prominent Login Failure Banner in UI */}
      {errorMsg ? (
        <View style={{
          backgroundColor: '#EF44441A',
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '700' }}>
              Authentication Issue
            </Text>
            <Text style={{ color: '#FCA5A5', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
              {errorMsg}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Google SSO Option for Residents */}
      {selectedRole === 'resident' && (
        <View style={{ marginBottom: 8 }}>
          <GoogleSSOButton onClick={() => setGoogleModal(true)} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
            <Text style={{ color: T.dim, fontSize: 12, paddingHorizontal: 10, fontWeight: '600' }}>
              OR SIGN IN WITH PHONE
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: T.border }} />
          </View>
        </View>
      )}

      <Card>
        <Input
          label="Registered Phone Number"
          placeholder="98765 43210"
          value={phone}
          onChange={(v: string) => {
            setPhone(v);
            setErrorMsg(null);
          }}
          icon="📞"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(v: string) => {
            setPassword(v);
            setErrorMsg(null);
          }}
          icon="🔒"
        />
        <Btn full disabled={loading} onClick={handleSubmit} style={{ marginTop: 10, paddingVertical: 14 }}>
          {loading ? 'Authenticating...' : 'Sign In →'}
        </Btn>
      </Card>

      {selectedRole === 'resident' && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: 20, alignItems: 'center' }}
        >
          <Text style={{ color: T.muted, fontSize: 14 }}>
            New to society? <Text style={{ color: T.green, fontWeight: '700' }}>Register Flat Here</Text>
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: 20, alignItems: 'center', marginBottom: 20 }}
      >
        <Text style={{ color: T.dim, fontSize: 13 }}>← Back to Welcome</Text>
      </TouchableOpacity>

      {/* Google SSO Prompt Modal */}
      {googleModal && (
        <Modal title="Google Account Sign-In" subtitle="One-tap secure resident access" onClose={() => setGoogleModal(false)}>
          <Text style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>
            Enter your Google email to authenticate and access your society portal instantly:
          </Text>
          <Input
            label="Google Email Address *"
            placeholder="e.g. resident@gmail.com"
            value={googleEmail}
            onChange={setGoogleEmail}
            icon="✉️"
          />
          <Input
            label="Full Name (Optional)"
            placeholder="e.g. Rahul Sharma"
            value={googleName}
            onChange={setGoogleName}
            icon="👤"
          />
          <Btn full variant="green" disabled={googleLoading} onClick={handleGoogleSignIn} style={{ marginTop: 12 }}>
            {googleLoading ? 'Connecting...' : 'Sign In with Google Account →'}
          </Btn>
        </Modal>
      )}
    </PageLayout>
  );
}

// ── Register Screen (Email Optional) ─────────────────────────────────────────
export function RegisterScreen({ navigation }: any) {
  const [societies, setSocieties] = useState<any[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>('');
  const [flats, setFlats] = useState<any[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(true);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', phone: '', email: '', flat_id: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    SocietyService.getAll()
      .then((r: any) => {
        const list = r.data?.data || [];
        setSocieties(list);
        if (list.length > 0) {
          setSelectedSocietyId(String(list[0].id));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSocieties(false));
  }, []);

  useEffect(() => {
    if (!selectedSocietyId) {
      setFlats([]);
      return;
    }
    setLoadingFlats(true);
    FlatService.getAll({ society_id: selectedSocietyId, per_page: 1000 })
      .then((r: any) => {
        const items = r.data?.data?.items || r.data?.data || [];
        setFlats(items);
        setForm((prev) => ({ ...prev, flat_id: '' }));
      })
      .catch(() => setFlats([]))
      .finally(() => setLoadingFlats(false));
  }, [selectedSocietyId]);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!selectedSocietyId) {
      setErrorMsg('Please select your society / community.');
      return;
    }
    if (!form.name.trim() || !form.phone.trim() || !form.flat_id) {
      setErrorMsg('Please fill in your name, phone number, and select a flat.');
      return;
    }
    if (form.email && !form.email.includes('@')) {
      setErrorMsg('Please enter a valid email address, or leave it blank.');
      return;
    }
    if (form.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (form.password !== form.confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        password: form.password,
        society_id: parseInt(selectedSocietyId),
        flat_id: parseInt(form.flat_id),
        move_in_date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Application Submitted', 'Your resident registration is pending society admin verification.');
      navigation.goBack();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.[0]?.msg || 'Registration failed';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const getFlatColor = (flatNumber: string) => {
    if (flatNumber.endsWith('A')) return '#60a5fa';
    if (flatNumber.endsWith('B')) return '#4ade80';
    return T.text;
  };

  return (
    <PageLayout title="Join Society" subtitle="Select your community & register flat">
      {/* Inline Error Banner */}
      {errorMsg ? (
        <View style={{
          backgroundColor: '#EF44441A',
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
          <Text style={{ fontSize: 20 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F87171', fontSize: 13, fontWeight: '700' }}>
              Registration Issue
            </Text>
            <Text style={{ color: '#FCA5A5', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
              {errorMsg}
            </Text>
          </View>
        </View>
      ) : null}

      <Card style={{ marginTop: 4 }}>
        {/* Step 1: Society Dropdown */}
        <Text style={{ fontSize: 12, color: T.accent, textTransform: 'uppercase', marginBottom: 6, fontWeight: '700' }}>
          1. Select Community / Society *
        </Text>
        <View style={{ backgroundColor: T.bg, borderColor: T.accent + '55', borderWidth: 1.5, borderRadius: 10, marginBottom: 16 }}>
          {loadingSocieties ? (
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={T.accent} style={{ marginRight: 8 }} />
              <Text style={{ color: T.muted }}>Loading societies...</Text>
            </View>
          ) : (
            <Picker
              selectedValue={selectedSocietyId}
              onValueChange={(v: string) => {
                setSelectedSocietyId(v);
                setErrorMsg(null);
              }}
              style={{ color: T.text }}
              dropdownIconColor={T.accent}
            >
              <Picker.Item label="Choose your society..." value="" color={T.muted} />
              {societies.map((s) => (
                <Picker.Item
                  key={s.id}
                  label={`🏢 ${s.name}${s.city ? ` · ${s.city}` : ''}`}
                  value={String(s.id)}
                  color={T.text}
                />
              ))}
            </Picker>
          )}
        </View>

        {/* Step 2: Flat Number Dropdown */}
        <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>
          2. Select Flat Number *
        </Text>
        <View style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, marginBottom: 16 }}>
          {loadingFlats ? (
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={T.accent} style={{ marginRight: 8 }} />
              <Text style={{ color: T.muted }}>Loading flats for society...</Text>
            </View>
          ) : (
            <Picker
              selectedValue={form.flat_id}
              enabled={!loadingFlats && flats.length > 0}
              onValueChange={(v: string) => {
                setForm({ ...form, flat_id: v });
                setErrorMsg(null);
              }}
              style={{ color: T.text }}
              dropdownIconColor={T.muted}
            >
              <Picker.Item
                label={flats.length === 0 ? 'No flats available' : 'Select your flat number...'}
                value=""
                color={T.muted}
              />
              {flats.map((f) => (
                <Picker.Item
                  key={f.id}
                  label={`Flat ${f.flat_number}`}
                  value={f.id.toString()}
                  color={getFlatColor(f.flat_number)}
                />
              ))}
            </Picker>
          )}
        </View>

        <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>
          3. Resident Account Details
        </Text>
        <Input label="Full Name *" placeholder="Resident Full Name" value={form.name} onChange={(v: string) => { setForm({ ...form, name: v }); setErrorMsg(null); }} />
        <Input label="Phone Number *" placeholder="98765 43210" value={form.phone} onChange={(v: string) => { setForm({ ...form, phone: v }); setErrorMsg(null); }} />
        <Input label="Email (Optional)" placeholder="resident@example.com" value={form.email} onChange={(v: string) => { setForm({ ...form, email: v }); setErrorMsg(null); }} />
        <Input label="Create Password (min 8 chars) *" type="password" value={form.password} onChange={(v: string) => { setForm({ ...form, password: v }); setErrorMsg(null); }} />
        <Input label="Confirm Password *" type="password" value={form.confirm} onChange={(v: string) => { setForm({ ...form, confirm: v }); setErrorMsg(null); }} />

        <Btn full disabled={loading} onClick={handleSubmit} style={{ marginTop: 10, paddingVertical: 14 }}>
          {loading ? 'Submitting Application...' : 'Submit Resident Application →'}
        </Btn>
      </Card>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: T.dim }}>← Back to Sign In</Text>
      </TouchableOpacity>
    </PageLayout>
  );
}
