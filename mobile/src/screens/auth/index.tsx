import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { T, Card, Btn, Input, PageLayout } from '../../components/UI';
import { AuthService, FlatService } from '../../services';
import { Picker } from '@react-native-picker/picker';

export function LandingScreen({ navigation }: any) {
  const ROLES = [
    { id:'resident', label:'Resident',       emoji:'🏠', desc:'Manage visitors, pay bills.', color:T.green },
    { id:'guard',    label:'Security Guard', emoji:'🛡️', desc:'Control gate access.', color:T.accent },
    { id:'admin',    label:'Admin',          emoji:'⚙️', desc:'Full society management.', color:'#F9A8D4' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.bg, padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Text style={{ fontSize: 40, fontWeight: '800', color: T.text, marginBottom: 8 }}>RM2 <Text style={{ color: T.accent }}>Gate</Text></Text>
        <Text style={{ fontSize: 15, color: T.muted }}>Visitor Management System</Text>
      </View>
      
      {ROLES.map(r => (
        <Card key={r.id} onClick={() => navigation.navigate('Login', { role: r.id })} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginRight: 16 }}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 4 }}>{r.label}</Text>
              <Text style={{ fontSize: 13, color: T.muted }}>{r.desc}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

export function LoginScreen({ route, navigation }: any) {
  const role = route.params?.role || 'resident';
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || !password) return Alert.alert('Error', 'Enter phone and password');
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Sign In" subtitle={`${role.toUpperCase()} PORTAL`} scroll={false}>
      <Card style={{ marginTop: 20 }}>
        <Input label="Phone Number" placeholder="98765 43210" value={phone} onChange={setPhone} icon="📞" />
        <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} icon="🔒" />
        <Btn full disabled={loading} onClick={handleSubmit} style={{ marginTop: 10 }}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </Btn>
      </Card>
      {role === 'resident' && (
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: T.muted }}>New resident? <Text style={{ color: T.green }}>Register here</Text></Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: role === 'resident' ? 16 : 24, alignItems: 'center' }}>
        <Text style={{ color: T.muted }}>← Back to Roles</Text>
      </TouchableOpacity>
    </PageLayout>
  );
}

export function RegisterScreen({ navigation }: any) {
  const [flats, setFlats] = useState<any[]>([]);
  const [form, setForm] = useState({ name:'', phone:'', email:'', flat_id:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    FlatService.getAll({ per_page: 1000 })
      .then((r: any) => setFlats(r.data.data?.items || r.data.data || []))
      .catch(()=>{});
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.flat_id) return Alert.alert('Error', 'Please fill all required fields');
    if (!form.email.includes('@')) return Alert.alert('Error', 'Please enter a valid email address');
    if (form.password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (form.password !== form.confirm) return Alert.alert('Error', 'Passwords do not match');
    setLoading(true);
    try {
      await AuthService.register({
        name: form.name, 
        phone: form.phone, 
        email: form.email, 
        password: form.password,
        flat_id: parseInt(form.flat_id), 
        move_in_date: new Date().toISOString().split('T')[0]
      });
      Alert.alert('Success', 'Registered! Pending admin approval.');
      navigation.goBack();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.[0]?.msg || 'Registration failed';
      Alert.alert('Registration Failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  const getFlatColor = (flatNumber: string) => {
    if (flatNumber.endsWith('A')) return '#60a5fa'; // Light Blue
    if (flatNumber.endsWith('B')) return '#4ade80'; // Light Green
    return T.text; // Default white
  };

  return (
    <PageLayout title="Register" subtitle="Create Resident Account">
      <Card style={{ marginTop: 20 }}>
        <Input label="Full Name *" placeholder="Your name" value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
        <Input label="Phone *" placeholder="98765 43210" value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} />
        <Input label="Email *" placeholder="you@example.com" value={form.email} onChange={(v: string) => setForm({...form, email: v})} />
        <Input label="Password (min 8 chars) *" type="password" value={form.password} onChange={(v: string) => setForm({...form, password: v})} />
        <Input label="Confirm Password *" type="password" value={form.confirm} onChange={(v: string) => setForm({...form, confirm: v})} />
        
        <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>Select Flat *</Text>
        <View style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, marginBottom: 16 }}>
          <Picker selectedValue={form.flat_id} onValueChange={(v: string) => setForm({...form, flat_id: v})} style={{ color: T.text }} dropdownIconColor={T.muted}>
            <Picker.Item label="Select your flat..." value="" color={T.muted} />
            {flats.map(f => <Picker.Item key={f.id} label={`Flat ${f.flat_number}`} value={f.id.toString()} color={getFlatColor(f.flat_number)} />)}
          </Picker>
        </View>

        <Btn full disabled={loading} onClick={handleSubmit} style={{ marginTop: 10 }}>
          {loading ? 'Submitting...' : 'Register →'}
        </Btn>
      </Card>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={{ color: T.muted }}>← Back to Login</Text>
      </TouchableOpacity>
    </PageLayout>
  );
}
