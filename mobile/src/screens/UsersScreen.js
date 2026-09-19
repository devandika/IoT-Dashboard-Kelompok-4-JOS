import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext, getThemeStyles } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function UsersScreen() {
  const { isDark } = useContext(ThemeContext);
  const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [serverIp, setServerIp] = useState('192.168.43.196');
  const [stats, setStats] = useState({ total: 0, admin: 0, user: 0 });

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('User');

  useEffect(() => {
    const init = async () => {
      const t = await AsyncStorage.getItem('userToken');
      const u = await AsyncStorage.getItem('userData');
      const ip = await AsyncStorage.getItem('serverIP');
      if (t) setToken(t);
      if (u) setCurrentUser(JSON.parse(u));
      if (ip) setServerIp(ip);
    };
    init();
  }, []);

  useEffect(() => {
    let interval;
    if (token) {
      fetchUsers();
      // Polling setiap 2 detik untuk refresh status online
      interval = setInterval(() => {
        // Ping agar backend tahu user ini sedang aktif di layar Users
        axios.post(`http://${serverIp}:8080/api/auth/ping`, {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
        // Refresh tabel
        fetchUsers();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, serverIp]);

  const fetchUsers = async () => {
    try {
      const API_URL = `http://${serverIp}:8080`;
      const response = await axios.get(`${API_URL}/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = response.data.data || [];
      setUsers(data);
      
      let adminCount = 0;
      let userCount = 0;
      data.forEach(u => {
        if(u.role === 'Admin') adminCount++;
        else userCount++;
      });
      setStats({ total: data.length, admin: adminCount, user: userCount });
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat data pengguna');
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormUserId('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('User');
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setIsEditMode(true);
    setFormUserId(user.id);
    setFormUsername(user.username);
    setFormPassword('');
    setFormRole(user.role);
    setModalVisible(true);
  };

  const confirmDelete = (id) => {
    Alert.alert('Hapus Pengguna', 'Apakah Anda yakin ingin menghapus pengguna ini secara permanen?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => executeDelete(id) }
    ]);
  };

  const executeDelete = async (id) => {
    try {
      const API_URL = `http://${serverIp}:8080`;
      await axios.delete(`${API_URL}/api/auth/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menghapus user';
      Alert.alert('Error', msg);
    }
  };

  const handleSave = async () => {
    if (!formUsername || (!isEditMode && !formPassword)) {
      Alert.alert('Info', 'Mohon lengkapi data');
      return;
    }

    try {
      const payload = { username: formUsername, role: formRole };
      if (formPassword) payload.password = formPassword;

      const API_URL = `http://${serverIp}:8080`;
      if (isEditMode) {
        await axios.put(`${API_URL}/api/auth/users/${formUserId}`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/auth/users`, payload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      const msg = error.response?.data?.message || 'Gagal menyimpan user';
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={themeStyles.container}>
      <View style={{ padding: 20 }}>
        <Text style={themeStyles.mainTitle}>Manajemen Pengguna</Text>
        
        {/* Stats */}
        <View style={styles.statsWrapper}>
          <View style={[themeStyles.statBox, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
            <MaterialCommunityIcons name="account-group" size={24} color={isDark ? "#60a5fa" : "#2563eb"} />
            <Text style={[themeStyles.statValue, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>{stats.total}</Text>
            <Text style={themeStyles.statLabel}>Total Users</Text>
          </View>
          <View style={[themeStyles.statBox, { backgroundColor: isDark ? '#7f1d1d' : '#fef2f2' }]}>
            <MaterialCommunityIcons name="shield-account" size={24} color={isDark ? "#f87171" : "#dc2626"} />
            <Text style={[themeStyles.statValue, { color: isDark ? '#fca5a5' : '#b91c1c' }]}>{stats.admin}</Text>
            <Text style={themeStyles.statLabel}>Admin Users</Text>
          </View>
          <View style={[themeStyles.statBox, { backgroundColor: isDark ? '#064e3b' : '#f0fdf4' }]}>
            <MaterialCommunityIcons name="account" size={24} color={isDark ? "#34d399" : "#16a34a"} />
            <Text style={[themeStyles.statValue, { color: isDark ? '#6ee7b7' : '#15803d' }]}>{stats.user}</Text>
            <Text style={themeStyles.statLabel}>Regular Users</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Tambah Pengguna Baru</Text>
        </TouchableOpacity>
      </View>

      <View style={themeStyles.tableWrapper}>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isOnline = item.is_online;
            const initial = item.username.substring(0,2).toUpperCase();
            const avatarColor = item.role === 'Admin' ? 'bg-danger' : 'bg-success';

            return (
              <View style={themeStyles.userCard}>
                <View style={[styles.avatar, { backgroundColor: item.role === 'Admin' ? '#ef4444' : '#10b981' }]}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={themeStyles.userName}>{item.username}</Text>
                  <Text style={themeStyles.userRole}>
                    {item.role === 'Admin' ? <MaterialCommunityIcons name="shield-account" size={12} color="#ef4444"/> : null} {item.role}
                  </Text>
                </View>
                
                <View style={isOnline ? styles.onlineBadge : styles.offlineBadge}>
                  <MaterialCommunityIcons name="circle" size={8} color={isOnline ? "#10b981" : "#9ca3af"} style={{marginRight: 4}}/>
                  <Text style={{fontSize: 10, color: isOnline ? '#10b981' : '#9ca3af', fontWeight: 'bold'}}>{isOnline ? 'Online' : 'Offline'}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginLeft: 10 }}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                    <MaterialCommunityIcons name="pencil" size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnDelete} onPress={() => confirmDelete(item.id)}>
                    <MaterialCommunityIcons name="trash-can" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: isDark ? '#64748b' : '#9ca3af' }}>Memuat pengguna...</Text>}
        />
      </View>

      {/* MODAL FORM */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={themeStyles.modalContent}>
            <Text style={themeStyles.modalTitle}>{isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={themeStyles.inputLabel}>Username</Text>
              <TextInput style={themeStyles.textInput} value={formUsername} onChangeText={setFormUsername} placeholder="Username" placeholderTextColor="#9ca3af"/>
            </View>

            <View style={styles.inputGroup}>
              <Text style={themeStyles.inputLabel}>{isEditMode ? 'Password (Kosongkan jika tidak diubah)' : 'Password'}</Text>
              <TextInput style={themeStyles.textInput} value={formPassword} onChangeText={setFormPassword} secureTextEntry placeholder="Password" placeholderTextColor="#9ca3af"/>
            </View>

            <View style={styles.inputGroup}>
              <Text style={themeStyles.inputLabel}>Role (Ketik 'Admin' atau 'User')</Text>
              <TextInput style={themeStyles.textInput} value={formRole} onChangeText={setFormRole} placeholder="User / Admin" placeholderTextColor="#9ca3af"/>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#6b7280' }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#2563eb' }]} onPress={handleSave}>
                <Text style={styles.modalBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  statsWrapper: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  addBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  actionBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 8 },
  actionBtnDelete: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  inputGroup: { marginBottom: 15 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: 'bold' }
});
