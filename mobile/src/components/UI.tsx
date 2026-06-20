import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Modal as RNModal, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export const T = {
  bg: '#080C14', surface: '#111827', surface2: '#162032',
  border: '#1e2d45',
  accent: '#00D4FF', accentDim: '#00d4ff18',
  green: '#00E5A0', greenDim: '#00e5a018',
  amber: '#FFB020', amberDim: '#ffb02018',
  red: '#FF4D6A', redDim: '#ff4d6a18',
  text: '#E8EDF5', muted: '#6B7A99', dim: '#3D4E6B',
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

export const Input = ({ label, type='text', placeholder, value, onChange, icon, required, secureTextEntry, onClear }: any) => {
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>{label} {required && <Text style={{color: T.red}}>*</Text>}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14 }}>
        {icon && <Text style={{ fontSize: 16, marginRight: 10, opacity: 0.6 }}>{icon}</Text>}
        <TextInput style={{ flex: 1, color: T.text, fontSize: 15, paddingVertical: 12 }} placeholder={placeholder} placeholderTextColor={T.dim} value={value} onChangeText={onChange} secureTextEntry={secureTextEntry || type === 'password'} />
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

export const Textarea = ({ label, value, onChange, placeholder, required }: any) => (
  <View style={{ marginBottom: 12 }}>
    {label && <Text style={{ fontSize: 12, color: T.muted, textTransform: 'uppercase', marginBottom: 6, fontWeight: '600' }}>{label} {required && <Text style={{color: T.red}}>*</Text>}</Text>}
    <TextInput style={{ backgroundColor: T.bg, borderColor: T.border, borderWidth: 1, borderRadius: 10, padding: 14, color: T.text, fontSize: 15, height: 100, textAlignVertical: 'top' }} multiline placeholder={placeholder} placeholderTextColor={T.dim} value={value} onChangeText={onChange} />
  </View>
);

export const PageLayout = ({ children, title, subtitle, action, scroll=true, onRefresh, refreshing=false, onScroll, scrollEventThrottle=16, scrollRef, floating }: any) => {
  const content = (
    <View style={{ padding: 24, paddingBottom: 100 }}>
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

