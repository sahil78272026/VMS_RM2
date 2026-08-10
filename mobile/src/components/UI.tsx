import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Modal as RNModal, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

export const T = {
  bg: '#F4F0EA',
  surface: '#FFFFFF',
  surface2: '#EBE5DC',
  border: '#E2DCD4',
  accent: '#0284C7',
  accentDim: '#E0F2FE',
  green: '#10B981',
  greenDim: '#DCFCE7',
  amber: '#F59E0B',
  amberDim: '#FEF3C7',
  red: '#EF4444',
  redDim: '#FEE2E2',
  text: '#1E293B',
  muted: '#64748B',
  dim: '#94A3B8',
};

export const Card = ({ children, style, onClick }: any) => {
  return (
    <TouchableOpacity activeOpacity={onClick ? 0.7 : 1} onPress={onClick} style={[{ backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, borderRadius: 16, padding: 16, marginVertical: 8 }, style]}>
      {children}
    </TouchableOpacity>
  );
};

export const Badge = ({ color, children, small }: any) => {
  const m: any = { green:[T.greenDim,T.green], amber:[T.amberDim,T.amber], red:[T.redDim,T.red], blue:[T.accentDim,T.accent] };
  const [bg, fg] = m[color] || [T.surface2, T.muted];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, borderColor: fg + '33', borderWidth: 1, borderRadius: 20, paddingHorizontal: small ? 8 : 12, paddingVertical: small ? 2 : 4, alignSelf: 'flex-start' }}>
      {color === 'green' && <View style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: T.green, marginRight: 6 }} />}
      <Text style={{ color: fg, fontSize: small ? 10 : 11, fontWeight: '600', textTransform: 'uppercase' }}>{children}</Text>
    </View>
  );
};

export const Avatar = ({ name='?', size=38, color=T.accent }: any) => {
  const ini = name.split(' ').map((w: string)=>w[0]||'').join('').slice(0,2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: color+'22', borderColor: color+'44', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size*0.4, fontWeight: '700' }}>{ini}</Text>
    </View>
  );
};

export const Btn = ({ children, onClick, variant='primary', sm, full, disabled, style }: any) => {
  const S: any = { primary:{bg:T.accent,fg:T.bg}, green:{bg:T.green,fg:T.bg}, red:{bg:T.red,fg:'#fff'}, ghost:{bg:'transparent',fg:T.muted,border:T.border}, outline:{bg:'transparent',fg:T.accent,border:T.accent+'55'}, amber:{bg:T.amber,fg:T.bg} };
  const s = S[variant] || S.primary;
  return (
    <TouchableOpacity disabled={disabled} onPress={onClick} style={[{ backgroundColor: variant==='ghost'||variant==='outline'?'transparent':s.bg, borderColor: s.border || 'transparent', borderWidth: s.border ? 1 : 0, borderRadius: 10, paddingVertical: sm ? 8 : 12, paddingHorizontal: sm ? 14 : 22, opacity: disabled ? 0.5 : 1, width: full ? '100%' : 'auto', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: s.fg, fontWeight: '600', fontSize: sm ? 13 : 15 }}>{children}</Text>
    </TouchableOpacity>
  );
};

export const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  required,
  secureTextEntry,
  onClear,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  textContentType,
  autoComplete,
  style,
  inputStyle,
}: any) => {
  const lowerLabel = (label || '').toLowerCase();
  const lowerPlaceholder = (placeholder || '').toLowerCase();
  const isSecure = secureTextEntry || type === 'password';

  let resolvedKeyboardType = keyboardType;
  let resolvedAutoCapitalize = autoCapitalize;
  let resolvedAutoCorrect = autoCorrect;
  let resolvedTextContentType = textContentType;
  let resolvedAutoComplete = autoComplete;

  if (!resolvedKeyboardType) {
    if (
      type === 'phone' ||
      type === 'tel' ||
      lowerLabel.includes('phone') ||
      lowerLabel.includes('mobile') ||
      lowerPlaceholder.includes('98765') ||
      lowerPlaceholder.includes('phone') ||
      icon === '📞'
    ) {
      resolvedKeyboardType = 'phone-pad';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'none';
      if (resolvedAutoCorrect === undefined) resolvedAutoCorrect = false;
      if (!resolvedTextContentType) resolvedTextContentType = 'telephoneNumber';
      if (!resolvedAutoComplete) resolvedAutoComplete = 'tel';
    } else if (
      type === 'number' ||
      type === 'numeric' ||
      type === 'pin' ||
      type === 'otp' ||
      lowerLabel.includes('passcode') ||
      lowerLabel.includes('pin') ||
      lowerLabel.includes('amount') ||
      lowerLabel.includes('rent') ||
      lowerLabel.includes('utr') ||
      lowerLabel.includes('reference') ||
      lowerLabel.includes('months') ||
      lowerLabel.includes('count') ||
      lowerLabel.includes('flats') ||
      lowerPlaceholder.includes('amount') ||
      lowerPlaceholder.includes('6-digit') ||
      lowerPlaceholder.includes('e.g. 123456') ||
      lowerPlaceholder.includes('329182371928')
    ) {
      resolvedKeyboardType = 'number-pad';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'none';
      if (resolvedAutoCorrect === undefined) resolvedAutoCorrect = false;
    } else if (
      type === 'email' ||
      lowerLabel.includes('email') ||
      lowerPlaceholder.includes('@') ||
      lowerPlaceholder.includes('email') ||
      icon === '✉️'
    ) {
      resolvedKeyboardType = 'email-address';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'none';
      if (resolvedAutoCorrect === undefined) resolvedAutoCorrect = false;
      if (!resolvedTextContentType) resolvedTextContentType = 'emailAddress';
      if (!resolvedAutoComplete) resolvedAutoComplete = 'email';
    } else if (isSecure) {
      resolvedKeyboardType = 'default';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'none';
      if (resolvedAutoCorrect === undefined) resolvedAutoCorrect = false;
      if (!resolvedTextContentType) resolvedTextContentType = 'password';
      if (!resolvedAutoComplete) resolvedAutoComplete = 'password';
    } else if (
      lowerLabel.includes('name') ||
      lowerPlaceholder.includes('name') ||
      icon === '👤'
    ) {
      resolvedKeyboardType = 'default';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'words';
      if (!resolvedTextContentType) resolvedTextContentType = 'name';
      if (!resolvedAutoComplete) resolvedAutoComplete = 'name';
    } else if (
      type === 'search' ||
      lowerLabel.includes('search') ||
      lowerPlaceholder.includes('search') ||
      icon === '🔍'
    ) {
      resolvedKeyboardType = 'default';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'none';
    } else {
      resolvedKeyboardType = 'default';
      if (resolvedAutoCapitalize === undefined) resolvedAutoCapitalize = 'sentences';
    }
  }

  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label && (
        <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>
          {label} {required && <Text style={{ color: T.red }}>*</Text>}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14 }}>
        {icon && <Text style={{ fontSize: 16, marginRight: 10, opacity: 0.6 }}>{icon}</Text>}
        <TextInput
          style={[{ flex: 1, color: T.text, fontSize: 15, paddingVertical: 12 }, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={T.dim}
          value={value}
          onChangeText={onChange}
          secureTextEntry={isSecure}
          keyboardType={resolvedKeyboardType}
          autoCapitalize={resolvedAutoCapitalize}
          autoCorrect={resolvedAutoCorrect}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textContentType={resolvedTextContentType}
          autoComplete={resolvedAutoComplete}
        />
        {onClear && value ? (
          <TouchableOpacity onPress={onClear} style={{ padding: 4, marginLeft: 6 }}>
            <Text style={{ color: T.muted, fontSize: 16, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export const Select = ({ label, value, onChange, options, placeholder, required }: any) => (
  <View style={{ marginBottom: 12 }}>
    {label && <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>{label} {required && <Text style={{color: T.red}}>*</Text>}</Text>}
    <View style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, overflow: 'hidden' }}>
      <Picker selectedValue={value} onValueChange={onChange} style={{ color: T.text }} dropdownIconColor={T.muted}>
        {placeholder && <Picker.Item label={placeholder} value="" color={T.muted} />}
        {options.map((o: any) => <Picker.Item key={o.value} label={o.label} value={o.value} color={o.color || T.text} />)}
      </Picker>
    </View>
  </View>
);

export const SearchableSelect = ({ label, value, onChange, options, placeholder, required }: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  
  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>{label} {required && <Text style={{color: T.red}}>*</Text>}</Text>}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: value ? T.text : T.dim, fontSize: 15 }}>{selectedLabel}</Text>
        <Text style={{ color: T.muted }}>▼</Text>
      </TouchableOpacity>

      <RNModal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: T.surface, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: T.text }}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{ color: T.muted, fontSize: 24 }}>✕</Text></TouchableOpacity>
            </View>
            <TextInput
              style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 15, color: T.text }}
              placeholder="Search..."
              placeholderTextColor={T.dim}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.map((o: any) => (
                <TouchableOpacity
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setModalVisible(false);
                    setSearch('');
                  }}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border }}
                >
                  <Text style={{ color: o.color || T.text, fontSize: 16, fontWeight: value === o.value ? '700' : '500' }}>{o.label}</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && <Text style={{ color: T.muted, textAlign: 'center', marginTop: 20 }}>No results found</Text>}
            </ScrollView>
          </View>
        </View>
      </RNModal>
    </View>
  );
};

export const Textarea = ({ label, value, onChange, placeholder, required, keyboardType = 'default', autoCapitalize = 'sentences' }: any) => (
  <View style={{ marginBottom: 12 }}>
    {label && <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>{label} {required && <Text style={{color: T.red}}>*</Text>}</Text>}
    <TextInput
      style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 14, color: T.text, fontSize: 15, height: 100, textAlignVertical: 'top' }}
      multiline
      placeholder={placeholder}
      placeholderTextColor={T.dim}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

export const PageLayout = ({ children, title, subtitle, action, scroll=true, onRefresh, refreshing=false, onScroll, scrollEventThrottle=16, scrollRef, floating }: any) => {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={{ paddingHorizontal: 22, paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: 60 + Math.max(insets.bottom, 16) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: T.text, marginBottom: 4 }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: 14, color: T.muted }}>{subtitle}</Text>}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {scroll ? (
        <ScrollView 
          ref={scrollRef}
          style={{ flex: 1 }} 
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} /> : undefined}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
      {floating}
    </View>
  );
};

export const EmptyState = ({ icon='📭', message='Nothing here yet', sub }: any) => (
  <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
    <Text style={{ fontSize: 48, marginBottom: 16 }}>{icon}</Text>
    <Text style={{ fontSize: 16, fontWeight: '600', color: T.muted, marginBottom: 6 }}>{message}</Text>
    {sub && <Text style={{ fontSize: 14, color: T.dim, textAlign: 'center' }}>{sub}</Text>}
  </View>
);

export const LoadingScreen = ({ message='Loading...' }: any) => (
  <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="large" color={T.accent} />
    <Text style={{ marginTop: 16, color: T.muted, fontSize: 15 }}>{message}</Text>
  </View>
);

export const StatCard = ({ label, value, color=T.accent, sub }: any) => (
  <Card style={{ flex: 1, marginHorizontal: 4 }}>
    <Text style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', marginBottom: 8, fontWeight: '600' }}>{label}</Text>
    <Text style={{ fontSize: 32, fontWeight: '800', color }}>{value}</Text>
    {sub && <Text style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>{sub}</Text>}
  </Card>
);

export const Modal = ({ children, onClose, title, subtitle }: any) => (
  <RNModal transparent visible animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#000000CC', justifyContent: 'center', padding: 20 }}>
      <View style={{ backgroundColor: T.surface, borderRadius: 16, padding: 24, maxHeight: '90%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            {title && <Text style={{ fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 4 }}>{title}</Text>}
            {subtitle && <Text style={{ fontSize: 13, color: T.muted }}>{subtitle}</Text>}
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}><Text style={{ color: T.muted, fontSize: 24 }}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView>{children}</ScrollView>
      </View>
    </View>
  </RNModal>
);

export const Tabs = ({ tabs, active, onChange }: any) => (
  <View style={{ flexDirection: 'row', borderBottomColor: T.border, borderBottomWidth: 1, marginBottom: 20 }}>
    {tabs.map((t: any) => (
      <TouchableOpacity key={t.id} onPress={() => onChange(t.id)} style={{ paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: active === t.id ? T.accent : 'transparent' }}>
        <Text style={{ color: active === t.id ? T.accent : T.muted, fontWeight: '600', fontSize: 14 }}>{t.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const Calendar = ({ value, onChange }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(new Date());

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const startDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = startDayOfMonth(year, month);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysGrid = [];
  for (let i = 0; i < startDay; i++) {
    daysGrid.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push(new Date(year, month, i));
  }

  return (
    <View style={{ backgroundColor: T.surface2, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: T.border, marginVertical: 12 }}>
      {/* Month Selector */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 6 }}>
          <Text style={{ color: T.accent, fontSize: 16, fontWeight: 'bold' }}>◀</Text>
        </TouchableOpacity>
        <Text style={{ color: T.text, fontWeight: '700', fontSize: 15 }}>{monthsList[month]} {year}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={{ padding: 6 }}>
          <Text style={{ color: T.accent, fontSize: 16, fontWeight: 'bold' }}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Week Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
          <Text key={i} style={{ color: T.muted, fontSize: 12, width: 32, textAlign: 'center', fontWeight: '600' }}>{d}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {daysGrid.map((d, i) => {
          if (d === null) {
            return <View key={`empty-${i}`} style={{ width: '14.28%', height: 36 }} />;
          }
          const dStr = formatDate(d);
          const isSelected = value === dStr;
          const isToday = todayStr === dStr;

          return (
            <TouchableOpacity
              key={dStr}
              onPress={() => onChange(dStr)}
              style={{
                width: '14.28%',
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 18,
                backgroundColor: isSelected ? T.accent : 'transparent',
                borderWidth: isToday ? 1.5 : 0,
                borderColor: T.accent,
              }}
            >
              <Text style={{ 
                color: isSelected ? T.bg : isToday ? T.accent : T.text, 
                fontWeight: isSelected || isToday ? '700' : '400',
                fontSize: 13 
              }}>
                {d.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Today Shortcut Button */}
      <TouchableOpacity
        onPress={() => onChange(todayStr)}
        style={{
          marginTop: 12,
          paddingVertical: 8,
          backgroundColor: T.surface,
          borderColor: T.border,
          borderWidth: 1,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>⚡ Select Today</Text>
      </TouchableOpacity>
    </View>
  );
};

export const SocietyBadge = ({ name = 'RM2 Residency', style }: any) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface2, borderColor: T.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' }, style]}>
    <Text style={{ fontSize: 13, marginRight: 6 }}>🏢</Text>
    <Text style={{ color: T.accent, fontSize: 12, fontWeight: '700' }}>{name}</Text>
  </View>
);

export const SocietySwitcher = ({ style, theme = 'dark', flatNumber }: any) => {
  const { activeSociety, societies, switchSociety, user } = require('../context/AuthContext').useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [switching, setSwitching] = useState(false);

  const isWarm = theme === 'warm';

  const handleSelect = async (id: string) => {
    setSwitching(true);
    try {
      await switchSociety(id);
      setModalVisible(false);
    } catch {}
    setSwitching(false);
  };

  const displayName = activeSociety 
    ? `${activeSociety.society_name} (${activeSociety.role.charAt(0).toUpperCase() + activeSociety.role.slice(1)})`
    : 'Select Profile';

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isWarm ? '#FFFFFF' : T.surface2,
          borderColor: isWarm ? '#DDD6CC' : T.accent + '55',
          borderWidth: 1,
          borderRadius: 22,
          paddingHorizontal: 12,
          paddingVertical: 7,
          alignSelf: 'flex-start',
          shadowColor: isWarm ? '#4A3E3D' : '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isWarm ? 0.08 : 0.2,
          shadowRadius: 3,
          elevation: isWarm ? 2 : 1,
        }, style]}
      >
        <View style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: '#0284C7',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}>
          <Text style={{ fontSize: 11 }}>🏢</Text>
        </View>
        <View>
          <Text style={{ color: isWarm ? '#1E293B' : T.text, fontSize: 13, fontWeight: '800' }}>
            {displayName} <Text style={{ color: isWarm ? '#64748B' : T.accent, fontSize: 11 }}>▾</Text>
          </Text>
        </View>
      </TouchableOpacity>

      <RNModal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: isWarm ? '#FFFFFF' : T.surface, borderRadius: 20, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: isWarm ? '#E5DFD7' : T.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isWarm ? '#1E293B' : T.text }}>Switch Profile</Text>
                <Text style={{ fontSize: 12, color: isWarm ? '#64748B' : T.muted, marginTop: 2 }}>Select a profile to use</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <Text style={{ color: isWarm ? '#64748B' : T.muted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {societies.map((s: any) => {
                const isSelected = s.id === activeSociety?.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    disabled={switching}
                    onPress={() => handleSelect(s.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isSelected ? (isWarm ? '#E0F2FE' : T.accentDim) : (isWarm ? '#F8F6F2' : T.surface2),
                      borderColor: isSelected ? '#0284C7' : (isWarm ? '#E5DFD7' : T.border),
                      borderWidth: 1,
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10
                    }}
                  >
                    <Text style={{ fontSize: 24, marginRight: 12 }}>🏢</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isSelected ? '#0284C7' : (isWarm ? '#1E293B' : T.text), fontWeight: '800', fontSize: 15 }}>
                        {s.society_name}
                      </Text>
                      <Text style={{ color: isWarm ? '#64748B' : T.muted, fontSize: 12, marginTop: 2 }}>
                        {s.role.charAt(0).toUpperCase() + s.role.slice(1)} {s.flat_number ? `· Flat ${s.flat_number}` : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <Badge color="blue" small>Active</Badge>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </RNModal>
    </>
  );
};

export const QuickActionTile = ({ icon, label, sub, color = '#0284C7', onClick, theme = 'dark' }: any) => {
  const isWarm = theme === 'warm';
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onClick}
      style={{
        flex: 1,
        backgroundColor: isWarm ? '#FFFFFF' : T.surface,
        borderColor: isWarm ? '#E2DCD4' : T.border,
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 104,
        shadowColor: isWarm ? '#4A3E3D' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isWarm ? 0.07 : 0.2,
        shadowRadius: 5,
        elevation: isWarm ? 3 : 2,
      }}
    >
      <View style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: color + '18',
        borderColor: color + '33',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
      }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <Text style={{ color: isWarm ? '#1E293B' : T.text, fontSize: 13, fontWeight: '800', textAlign: 'center' }} numberOfLines={1}>
        {label}
      </Text>
      {sub && <Text style={{ color: isWarm ? '#64748B' : T.dim, fontSize: 10, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>{sub}</Text>}
    </TouchableOpacity>
  );
};
