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

// ── Landing Screen (Clean & Minimal Intro) ──────────────────────────────────
export function LandingScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'space-between', paddingVertical: 48, paddingHorizontal: 24 }}>
      {/* Brand Hero */}
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <View style={{
          width: 76,
          height: 76,
          borderRadius: 24,
          backgroundColor: T.surface,
          borderColor: T.accent + '33',
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        }}>
          <Text style={{ fontSize: 38 }}>🏢</Text>
        </View>
        <Text style={{ fontSize: 32, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
          RM2 <Text style={{ color: T.accent }}>Secure</Text>
        </Text>
        <Text style={{ fontSize: 14, color: T.muted, marginTop: 6, fontWeight: '500' }}>
          Smart Community & Gate Management
        </Text>
      </View>

      {/* Value Proposition Highlight */}
      <View style={{
        backgroundColor: T.surface,
        borderColor: T.border,
        borderWidth: 1,
        borderRadius: 20,
        padding: 20,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: T.text, fontSize: 14 }}>Seamless Gate Approvals</Text>
            <Text style={{ color: T.muted, fontSize: 12 }}>1-tap pass for guests, cabs & deliveries</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: T.border }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 20 }}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: T.text, fontSize: 14 }}>Instant Notifications</Text>
            <Text style={{ color: T.muted, fontSize: 12 }}>Real-time photo alerts at arrival</Text>
          </View>
        </View>
      </View>

      {/* Clean Primary Actions */}
      <View>
        <Btn
          full
          onClick={() => navigation.navigate('Login')}
          style={{ paddingVertical: 15, borderRadius: 14 }}
        >
          Continue with Mobile Number →
        </Btn>
      </View>
    </View>
  );
}

// ── Login Screen (100% OTP-Based Authentication) ────────────────────────────
export function LoginScreen({ navigation }: any) {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);

  // Countdown timer for OTP Resend
  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async () => {
    setErrorMsg(null);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Mobile number must be exactly 10 digits.');
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtp(cleanPhone);
      if (res?.data?.dev_otp || res?.dev_otp) {
        setDevOtp(res?.data?.dev_otp || res?.dev_otp);
      }
      setTimer(30);
      setStep('otp');
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error?.details || 'Unable to send OTP. Please try again.';
      setErrorMsg(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg(null);
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(cleanPhone, cleanOtp);
      if (result?.is_new_user) {
        navigation.navigate('Register', { phone: cleanPhone });
        return;
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error?.details || 'Invalid verification code. Please try again.';
      setErrorMsg(typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title={step === 'otp' ? 'Enter OTP' : 'Sign In'}
      subtitle={step === 'otp' ? `Verification code sent to +91 ${phone}` : 'Enter your mobile number to continue'}
      scroll={true}
    >
      {/* Branding Header */}
      <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 6 }}>
        <View style={{
          width: 58,
          height: 58,
          borderRadius: 18,
          backgroundColor: T.surface,
          borderColor: T.accent + '33',
          borderWidth: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        }}>
          <Text style={{ fontSize: 28 }}>🏢</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
          RM2 <Text style={{ color: T.accent }}>Secure</Text>
        </Text>
      </View>

      {/* Error Alert Banner */}
      {errorMsg ? (
        <View style={{
          backgroundColor: '#EF444414',
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '700' }}>
              Authentication Failed
            </Text>
            <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 2, lineHeight: 16 }}>
              {errorMsg}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── STEP 1: ENTER PHONE NUMBER (OTP ONLY) ─────────────────────────── */}
      {step === 'phone' && (
        <Card style={{ padding: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: T.muted, marginBottom: 14 }}>
            Enter your mobile number to receive a one-time verification code:
          </Text>

          <Input
            label="Mobile Number"
            placeholder="e.g. 9876543210"
            maxLength={10}
            keyboardType="number-pad"
            value={phone}
            onChange={(v: string) => {
              const numericValue = v.replace(/[^0-9]/g, '');
              setPhone(numericValue);
              setErrorMsg(null);
            }}
            icon="📞"
          />

          <Btn
            full
            disabled={loading}
            onClick={handleSendOtp}
            style={{ marginTop: 8, paddingVertical: 14, borderRadius: 12 }}
          >
            {loading ? 'Sending Code...' : 'Get Verification Code →'}
          </Btn>
        </Card>
      )}

      {/* ── STEP 2: ENTER OTP CODE ────────────────────────────────────────── */}
      {step === 'otp' && (
        <Card style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 12, color: T.muted, fontWeight: '500' }}>Mobile Number</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, marginTop: 2 }}>
                +91 {phone}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setErrorMsg(null);
                setStep('phone');
              }}
              style={{
                backgroundColor: T.surface2,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: T.border,
              }}
            >
              <Text style={{ fontSize: 12, color: T.accent, fontWeight: '700' }}>✏️ Change</Text>
            </TouchableOpacity>
          </View>

          <Input
            label="6-Digit Verification Code"
            placeholder="• • • • • •"
            value={otp}
            onChange={(v: string) => {
              setOtp(v);
              setErrorMsg(null);
            }}
            icon="🔒"
            keyboardType="number-pad"
            maxLength={6}
          />

          {/* Dev Mode Auto-fill Chip */}
          <TouchableOpacity
            onPress={() => setOtp(devOtp || '123456')}
            style={{
              backgroundColor: '#3B82F614',
              borderColor: '#3B82F644',
              borderWidth: 1,
              borderRadius: 8,
              paddingVertical: 6,
              paddingHorizontal: 10,
              marginBottom: 14,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '600' }}>
              💡 Dev Code: {devOtp || '123456'} (Tap to fill)
            </Text>
          </TouchableOpacity>

          <Btn
            full
            disabled={loading}
            onClick={handleVerifyOtp}
            style={{ paddingVertical: 14, borderRadius: 12 }}
          >
            {loading ? 'Verifying...' : 'Verify & Sign In →'}
          </Btn>

          {/* Resend OTP Action */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            {timer > 0 ? (
              <Text style={{ color: T.muted, fontSize: 13, fontWeight: '500' }}>
                Resend code in <Text style={{ color: T.text, fontWeight: '700' }}>0:{timer < 10 ? `0${timer}` : timer}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading}
                style={{ paddingVertical: 4 }}
              >
                <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>
                  🔄 Resend OTP Code
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}
    </PageLayout>
  );
}

// ── Register / Onboarding Screen (Post-OTP Flow) ─────────────────────────────
export function RegisterScreen({ navigation, route }: any) {
  const verifiedPhone = route?.params?.phone || '';
  const { registerResident } = useAuth();
  const [societies, setSocieties] = useState<any[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<string>('');
  const [flats, setFlats] = useState<any[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(true);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: verifiedPhone,
    flat_id: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verifiedPhone && !form.phone) {
      setForm((prev) => ({ ...prev, phone: verifiedPhone }));
    }
  }, [verifiedPhone]);

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
    if (!form.phone.trim() || !form.flat_id) {
      setErrorMsg('Please select your flat.');
      return;
    }
    if (!form.name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (form.email && !form.email.includes('@')) {
      setErrorMsg('Please enter a valid email address, or leave it blank.');
      return;
    }

    setLoading(true);
    try {
      await registerResident({
        name: form.name.trim(),
        phone: form.phone.trim(),
        society_id: parseInt(selectedSocietyId),
        flat_id: parseInt(form.flat_id),
        move_in_date: new Date().toISOString().split('T')[0],
      });
      // User is now authenticated in AuthContext and will be automatically redirected to ResidentDashboard!
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
    <PageLayout
      title="Join Society"
      subtitle="Complete your profile to access your flat"
      scroll={true}
    >
      {/* Beautiful New Resident Welcome Banner */}
      <View style={{
        backgroundColor: '#E0F2FE',
        borderColor: '#BAE6FD',
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 20,
          marginBottom: 12,
        }}>
          <Text style={{ color: '#0284C7', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
            👋 NEW RESIDENT?
          </Text>
        </View>
        
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 4 }}>
          Welcome to RM2 Secure!
        </Text>
        <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20 }}>
          Please fill in your society and flat details below to complete your onboarding and unlock your gate access.
        </Text>
      </View>

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

      <Card style={{ marginTop: 4, padding: 20 }}>
        {/* Step 1: Verified Mobile Badge */}
        <View style={{
          backgroundColor: '#10B98114',
          borderColor: '#10B98144',
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          marginBottom: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>
              Verified Mobile Number
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: T.text, marginTop: 2 }}>
              +91 {form.phone || verifiedPhone}
            </Text>
          </View>
          <Text style={{ fontSize: 18 }}>✅</Text>
        </View>

        {/* Step 2: Society Dropdown */}
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

        {/* Step 3: Flat Number Dropdown */}
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

        {/* Step 4: Name Input */}
        <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>
          3. Your Full Name *
        </Text>
        <Input
          placeholder="e.g. John Doe"
          value={form.name}
          onChange={(v: string) => setForm({ ...form, name: v })}
          autoCapitalize="words"
        />
        <Btn full disabled={loading} onClick={handleSubmit} style={{ marginTop: 10, paddingVertical: 14 }}>
          {loading ? 'Submitting Application...' : 'Complete Setup & Join Society →'}
        </Btn>
      </Card>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: T.dim }}>← Back</Text>
      </TouchableOpacity>
    </PageLayout>
  );
}
