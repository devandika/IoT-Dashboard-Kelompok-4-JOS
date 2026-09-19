import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext, getThemeStyles } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ActuatorHistoryScreen() {
  const { isDark } = useContext(ThemeContext);
  const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

  const [histori, setHistori] = useState([]);
  const [filterLimit, setFilterLimit] = useState('25'); 
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [dbStatus, setDbStatus] = useState('menghubungkan...');

  const ambilDataHistori = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const ip = await AsyncStorage.getItem('serverIP');
      const currentIp = ip || '192.168.43.196';

      const response = await axios.get(`http://${currentIp}:8080/api/history/actuator?limit=${filterLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const rawData = response.data.data || response.data;
      
      setHistori(rawData);
      setLastUpdate(new Date().toLocaleTimeString('id-ID'));
      setDbStatus('Terhubung ke Server');
    } catch (error) {
      setDbStatus('Gagal Memuat Server API');
    }
  };

  useEffect(() => {
    ambilDataHistori();
    const interval = setInterval(ambilDataHistori, 2000);
    return () => clearInterval(interval);
  }, [filterLimit]);

  const formatWaktu = (waktuStr) => {
    if (!waktuStr) return `-`; 
    const date = new Date(waktuStr);
    return `${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID')}`;
  };

  return (
    <View style={themeStyles.container}>
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <View style={styles.headerRow}>
            <View>
              <Text style={themeStyles.mainTitle}>Tabel Riwayat Aktuator</Text>
              <Text style={{fontSize: 10, color: dbStatus.includes('Gagal') ? '#ef4444' : '#10b981'}}>{dbStatus}</Text>
            </View>
            <View style={themeStyles.updateBadge}>
               <MaterialCommunityIcons name="clock-outline" size={14} color={isDark ? "#94a3b8" : "#6b7280"} />
               <Text style={themeStyles.updateText}>{lastUpdate}</Text>
            </View>
        </View>
        
        <View style={themeStyles.filterBox}>
          <Text style={themeStyles.filterLabel}>Tampilkan:</Text>
          <View style={styles.filterTabs}>
            {['25', '50', '100', '500'].map((limit) => (
              <TouchableOpacity key={limit} style={[themeStyles.tabBtn, filterLimit === limit && styles.tabBtnActive]} onPress={() => setFilterLimit(limit)}>
                <Text style={[themeStyles.tabText, filterLimit === limit && styles.tabTextActive]}>{limit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      <View style={themeStyles.tableWrapper}>
        <View style={themeStyles.tableHeader}>
          <Text style={[styles.thText, { flex: 0.8 }]}>ID</Text>
          <Text style={[styles.thText, { flex: 1.5 }]}>Device</Text>
          <Text style={[styles.thText, { flex: 1 }]}>Status</Text>
          <Text style={[styles.thText, { flex: 1.5 }]}>Waktu Perubahan</Text>
        </View>

        <FlatList
          data={histori}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => {
            const isON = item.status_led === 1 || item.status_led === 'ON';
            return (
              <View style={[themeStyles.tableRow, index % 2 === 0 ? themeStyles.rowEven : themeStyles.rowOdd]}>
                <Text style={[themeStyles.tdText, { flex: 0.8, fontWeight: 'bold' }]}>{item.id}</Text>
                <View style={{ flex: 1.5, alignItems: 'center' }}>
                  <Text style={[themeStyles.tdText, { fontWeight: 'bold' }]}>LED Utama</Text>
                  <Text style={{ fontSize: 9, color: isDark ? '#94a3b8' : '#6b7280' }}>kelasiot/{item.sn || 'Unknown'}/led</Text>
                </View>
                <View style={[{ flex: 1, alignItems: 'center' }]}>
                  <View style={[styles.badgeWeb, { backgroundColor: isON ? (isDark ? '#064e3b' : '#dcfce7') : (isDark ? '#7f1d1d' : '#fee2e2') }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: isON ? (isDark ? '#34d399' : '#166534') : (isDark ? '#f87171' : '#991b1b') }}>
                      {isON ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>
                <Text style={[themeStyles.tdText, { flex: 1.5, fontSize: 10 }]}>{formatWaktu(item.waktu)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: isDark ? '#64748b' : '#9ca3af' }}>Tidak ada data perubahan.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  filterTabs: { flexDirection: 'row', gap: 6 },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabTextActive: { color: '#ffffff' },
  thText: { color: '#f8fafc', fontSize: 12, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  badgeWeb: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 }
});
