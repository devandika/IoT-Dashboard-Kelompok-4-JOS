if (typeof window !== 'undefined' && !window.localStorage) {
  window.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, StyleSheet, StatusBar, Modal, TextInput, LogBox 
} from 'react-native';

LogBox.ignoreLogs([
  'ProgressBarAndroid has been extracted',
  'SafeAreaView has been deprecated',
  'Clipboard has been extracted',
  'InteractionManager has been deprecated',
  'PushNotificationIOS has been extracted',
]);
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, DefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { registerRootComponent } from 'expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SensorHistoryScreen from './src/screens/SensorHistoryScreen';
import ActuatorHistoryScreen from './src/screens/ActuatorHistoryScreen';
import UsersScreen from './src/screens/UsersScreen';
import AIHistoryScreen from './src/screens/AIHistoryScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
import { ThemeContext, getThemeStyles } from './src/theme';

// --- HALAMAN DUMMY: DATA PERANGKAT ---
function DevicesScreen() {
  const { isDark } = useContext(ThemeContext);
  const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

  const [devices, setDevices] = useState([
    { id: '1', name: 'ESP32 Main Controller', status: 'Online', type: 'NodeMCU ESP32', sn: 'SN-ESP32-001', ip: '192.168.1.101', room: 'Ruang Tamu' },
    { id: '2', name: 'Arduino Sensor Node', status: 'Offline', type: 'Arduino Uno R3', sn: 'SN-ARD-002', ip: '192.168.1.102', room: 'Kamar Tidur' },
    { id: '3', name: 'ESP8266 Kitchen Node', status: 'Online', type: 'Wemos D1 Mini', sn: 'SN-ESP82-003', ip: '192.168.1.103', room: 'Dapur' },
    { id: '4', name: 'Raspberry Pi Gateway', status: 'Online', type: 'Raspberry Pi 4', sn: 'SN-RPI-004', ip: '192.168.1.104', room: 'Teras Depan' }
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', type: '', sn: '', ip: '', room: '' });

  const handleAddDevice = () => {
    if (!newDevice.name || !newDevice.type || !newDevice.sn || !newDevice.ip || !newDevice.room) {
      return; // Cukup abaikan jika belum lengkap
    }
    setDevices([
      ...devices,
      {
        id: Math.random().toString(),
        name: newDevice.name,
        type: newDevice.type,
        sn: newDevice.sn,
        ip: newDevice.ip,
        room: newDevice.room,
        status: 'Online'
      }
    ]);
    setNewDevice({ name: '', type: '', sn: '', ip: '', room: '' });
    setModalVisible(false);
  };

  const renderItem = ({ item }) => (
    <View style={themeStyles.userCard}>
      <View style={[styles.avatar, { backgroundColor: item.status === 'Online' ? '#10b981' : '#ef4444' }]}>
        <MaterialCommunityIcons name="cpu-64-bit" size={24} color="#fff" />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={themeStyles.userName}>{item.name}</Text>
        <Text style={themeStyles.userRole}>{item.type} • {item.sn}</Text>
        <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#6b7280' }}>IP: {item.ip} | Ruang: {item.room}</Text>
      </View>
      <View style={[styles.onlineBadge, { backgroundColor: item.status === 'Online' ? '#dcfce7' : '#fee2e2' }]}>
        <Text style={{ color: item.status === 'Online' ? '#16a34a' : '#ef4444', fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={themeStyles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0f172a" : "#f3f4f6"} />
      <View style={{ padding: 20, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={[themeStyles.mainTitle, { marginBottom: 0 }]}>Daftar Perangkat</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 4 }}>Tambah</Text>
            </TouchableOpacity>
        </View>
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ width: '85%', backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000', marginBottom: 15 }}>Tambah Perangkat</Text>
                
                <TextInput style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} placeholder="Nama Perangkat" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} value={newDevice.name} onChangeText={t => setNewDevice({...newDevice, name: t})} />
                <TextInput style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} placeholder="Tipe Board" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} value={newDevice.type} onChangeText={t => setNewDevice({...newDevice, type: t})} />
                <TextInput style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} placeholder="Serial Number" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} value={newDevice.sn} onChangeText={t => setNewDevice({...newDevice, sn: t})} />
                <TextInput style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} placeholder="Alamat IP" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} value={newDevice.ip} onChangeText={t => setNewDevice({...newDevice, ip: t})} />
                <TextInput style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} placeholder="Lokasi Ruangan" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} value={newDevice.room} onChangeText={t => setNewDevice({...newDevice, room: t})} />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 10, marginRight: 10 }}>
                        <Text style={{ color: isDark ? '#94a3b8' : '#6b7280', fontWeight: 'bold' }}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddDevice} style={{ backgroundColor: '#2563eb', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Simpan</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

// === CUSTOM DRAWER CONTENT ===
function CustomDrawerContent(props) {
  const { isDark } = useContext(ThemeContext);
  const user = props.user;
  
  const [isPwdModalVisible, setPwdModalVisible] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isLoadingPwd, setIsLoadingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      import('react-native').then(RN => RN.Alert.alert('Error', 'Harap isi semua field password.'));
      return;
    }
    if (newPwd !== confirmPwd) {
      import('react-native').then(RN => RN.Alert.alert('Error', 'Konfirmasi password baru tidak cocok.'));
      return;
    }
    setIsLoadingPwd(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const ip = await AsyncStorage.getItem('serverIP');
      const baseURL = ip ? `http://${ip}:8080` : `http://192.168.43.196:8080`;
      
      const res = await axios.post(`${baseURL}/api/auth/change-password`, 
        { currentPassword: currentPwd, newPassword: newPwd },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      import('react-native').then(RN => RN.Alert.alert('Sukses', res.data.message));
      setPwdModalVisible(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      let msg = 'Kata sandi salah atau terjadi kesalahan.';
      if (err.response && err.response.data && err.response.data.message) {
          msg = err.response.data.message;
      } else if (err.response && err.response.status === 400) {
          msg = 'Kata sandi salah.';
      }
      import('react-native').then(RN => RN.Alert.alert('Gagal', msg));
    } finally {
      setIsLoadingPwd(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Profile Header */}
        <View style={{ 
          padding: 20, paddingTop: 50, paddingBottom: 20, 
          backgroundColor: isDark ? '#1e293b' : '#f8fafc', 
          borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#e2e8f0', 
          marginBottom: 10 
        }}>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <View style={{ 
               width: 50, height: 50, borderRadius: 25, 
               backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' 
             }}>
               <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                 {user && user.username ? user.username.substring(0,2).toUpperCase() : 'U'}
               </Text>
             </View>
             <View style={{ marginLeft: 15 }}>
               <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }}>
                 {user ? user.username : 'User'}
               </Text>
               <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
                 {user ? user.role : ''}
               </Text>
             </View>
           </View>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Aksi Tambahan di bawah */}
      <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#e2e8f0' }}>
        <TouchableOpacity 
          onPress={() => setPwdModalVisible(true)} 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
        >
          <MaterialCommunityIcons name="key" size={22} color={isDark ? "#60a5fa" : "#2563eb"} />
          <Text style={{ marginLeft: 15, fontSize: 15, fontWeight: 'bold', color: isDark ? "#60a5fa" : "#2563eb" }}>Ubah Kata Sandi</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => {
            import('react-native').then(RN => {
                RN.Alert.alert(
                  "Konfirmasi", 
                  "Apakah Anda yakin ingin keluar?",
                  [
                    { text: "Batal", style: "cancel" },
                    { text: "Ya, Keluar", onPress: props.handleLogout, style: "destructive" }
                  ]
                );
            });
          }} 
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <MaterialCommunityIcons name="logout" size={22} color="#ef4444" />
          <Text style={{ marginLeft: 15, fontSize: 15, fontWeight: 'bold', color: '#ef4444' }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL UBAH PASSWORD */}
      <Modal visible={isPwdModalVisible} transparent={true} animationType="fade" onRequestClose={() => setPwdModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ width: '85%', backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000', marginBottom: 15 }}>Ubah Kata Sandi</Text>
                
                <TextInput 
                    style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} 
                    placeholder="Password Saat Ini" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} 
                    secureTextEntry value={currentPwd} onChangeText={setCurrentPwd} 
                />
                <TextInput 
                    style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000', marginBottom: 10 }]} 
                    placeholder="Password Baru" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} 
                    secureTextEntry value={newPwd} onChangeText={setNewPwd} 
                />
                <TextInput 
                    style={[styles.inputBox, { backgroundColor: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#fff' : '#000' }]} 
                    placeholder="Konfirmasi Password Baru" placeholderTextColor={isDark ? '#94a3b8' : '#6b7280'} 
                    secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} 
                />

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                    <TouchableOpacity onPress={() => setPwdModalVisible(false)} style={{ padding: 10, marginRight: 10 }}>
                        <Text style={{ color: isDark ? '#94a3b8' : '#6b7280', fontWeight: 'bold' }}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleChangePassword} disabled={isLoadingPwd} style={{ backgroundColor: '#2563eb', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{isLoadingPwd ? 'Menyimpan...' : 'Simpan'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

// === MAIN APP NAVIGATOR ===
function DrawerNavigator({ navigation }) {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await AsyncStorage.getItem('userData');
      if (u) {
        const parsed = JSON.parse(u);
        setRole(parsed.role);
        setUser(parsed);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    navigation.replace('Login');
  };

  const CustomHeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
      <TouchableOpacity onPress={toggleTheme} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: isDark ? '#334155' : '#e5e7eb', borderRadius: 12, gap: 6, marginRight: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#374151' }}>Mode</Text>
        <MaterialCommunityIcons name={isDark ? "weather-sunny" : "weather-night"} size={20} color={isDark ? "#fbbf24" : "#4b5563"} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Drawer.Navigator 
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} user={user} handleLogout={handleLogout} />}
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? '#1e293b' : '#ffffff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f3f4f6' },
        headerTintColor: isDark ? '#f8fafc' : '#1f2937', headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveBackgroundColor: isDark ? '#1e3a8a' : '#eff6ff', drawerActiveTintColor: isDark ? '#60a5fa' : '#2563eb',
        drawerInactiveTintColor: isDark ? '#cbd5e1' : '#4b5563', drawerStyle: { backgroundColor: isDark ? '#0f172a' : '#ffffff' },
        drawerLabelStyle: { fontWeight: 'bold', fontSize: 15 }, headerRight: () => <CustomHeaderRight />
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ drawerIcon: ({color}) => <MaterialCommunityIcons name="view-dashboard" size={22} color={color} /> }} />
      <Drawer.Screen name="Data Sensor" component={SensorHistoryScreen} options={{ drawerIcon: ({color}) => <MaterialCommunityIcons name="thermometer" size={22} color={color} /> }} />
      <Drawer.Screen name="Data Aktuator" component={ActuatorHistoryScreen} options={{ drawerIcon: ({color}) => <MaterialCommunityIcons name="led-on" size={22} color={color} /> }} />
      <Drawer.Screen name="Perangkat (Dummy)" component={DevicesScreen} options={{ drawerIcon: ({color}) => <MaterialCommunityIcons name="cpu-64-bit" size={22} color={color} /> }} />
      <Drawer.Screen name="Riwayat Analisa" component={AIHistoryScreen} options={{ drawerIcon: ({color}) => <MaterialCommunityIcons name="brain" size={22} color={color} /> }} />
      {role === 'Admin' && (
        <Drawer.Screen name="Pengguna" component={UsersScreen} options={{ drawerIcon: ({color}) => <MaterialCommunityIcons name="account-group" size={22} color={color} /> }} />
      )}
    </Drawer.Navigator>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <NavigationContainer theme={isDark ? NavDarkTheme : DefaultTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={DrawerNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusBadgeText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  sensorCardsWrapper: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  sensorCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  miniBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
  sensorVal: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  sensorUnit: { fontSize: 16, fontWeight: '600' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  chartWrapper: { alignItems: 'center', justifyContent: 'center' },
  interactiveDeviceCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, marginBottom: 12, borderWidth: 1.5 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  deviceStatusText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  inputBox: { padding: 12, borderRadius: 8, marginBottom: 10 }
});

registerRootComponent(App);
