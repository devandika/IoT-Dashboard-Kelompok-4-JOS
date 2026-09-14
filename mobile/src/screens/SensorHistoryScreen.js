import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext, getThemeStyles } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SensorHistoryScreen() {
  const { isDark } = useContext(ThemeContext);
  const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

  const [histori, setHistori] = useState([]);
  const [token, setToken] = useState(null);
  const [serverIp, setServerIp] = useState('192.168.43.196');
  const [filterLimit, setFilterLimit] = useState('25'); 
  const [lastUpdate, setLastUpdate] = useState('--:--:--');
  const [dbStatus, setDbStatus] = useState('menghubungkan...');

  const ambilDataHistori = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const ip = await AsyncStorage.getItem('serverIP');
      if (ip) setServerIp(ip);
      const response = await axios.get(`http://${ip || serverIp}:8080/api/history?limit=${filterLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistori(response.data.data || response.data);
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
    return date.toLocaleTimeString('id-ID');
  };

  return (
    <View style={themeStyles.container}>
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <View style={styles.headerRow}>
            <View>
              <Text style={themeStyles.mainTitle}>Tabel Histori</Text>
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
            {['5', '25', '50', '100'].map((limit) => (
              <TouchableOpacity key={limit} style={[themeStyles.tabBtn, filterLimit === limit && styles.tabBtnActive]} onPress={() => setFilterLimit(limit)}>
                <Text style={[themeStyles.tabText, filterLimit === limit && styles.tabTextActive]}>{limit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 10 }}>
        
        {/* Table Suhu */}
        <View style={[themeStyles.tableWrapper, { flex: 1, marginRight: 5 }]}>
          <View style={[themeStyles.tableHeader, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
            <Text style={[styles.thText, { flex: 0.4, color: '#ea580c' }]}>ID</Text>
            <Text style={[styles.thText, { flex: 0.8, color: '#ea580c' }]}>SN</Text>
            <Text style={[styles.thText, { flex: 0.8, color: '#ea580c' }]}>Suhu</Text>
            <Text style={[styles.thText, { flex: 1, color: '#ea580c' }]}>Waktu</Text>
          </View>
          <FlatList
            data={histori}
            keyExtractor={(item) => 'suhu' + item.id.toString()}
            renderItem={({ item, index }) => (
              <View style={[themeStyles.tableRow, index % 2 === 0 ? themeStyles.rowEven : themeStyles.rowOdd]}>
                <Text style={[themeStyles.tdText, { flex: 0.4, fontWeight: 'bold' }]}>{item.id}</Text>
                <Text style={[themeStyles.tdText, { flex: 0.8, fontSize: 9, color: isDark ? '#94a3b8' : '#6b7280' }]}>SN-ESP32-001</Text>
                <Text style={[themeStyles.tdText, { flex: 0.8, color: isDark ? '#fdba74' : '#ea580c', fontWeight: 'bold' }]}>{item.suhu}°C</Text>
                <Text style={[themeStyles.tdText, { flex: 1, fontSize: 10 }]}>{formatWaktu(item.waktu)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: isDark ? '#64748b' : '#9ca3af' }}>Kosong</Text>}
          />
        </View>

        {/* Table Kelembaban */}
        <View style={[themeStyles.tableWrapper, { flex: 1, marginLeft: 5 }]}>
          <View style={[themeStyles.tableHeader, { backgroundColor: isDark ? '#082f49' : '#f0f9ff' }]}>
            <Text style={[styles.thText, { flex: 0.4, color: '#0ea5e9' }]}>ID</Text>
            <Text style={[styles.thText, { flex: 0.8, color: '#0ea5e9' }]}>SN</Text>
            <Text style={[styles.thText, { flex: 0.8, color: '#0ea5e9' }]}>Lembab</Text>
            <Text style={[styles.thText, { flex: 1, color: '#0ea5e9' }]}>Waktu</Text>
          </View>
          <FlatList
            data={histori}
            keyExtractor={(item) => 'kelembaban' + item.id.toString()}
            renderItem={({ item, index }) => (
              <View style={[themeStyles.tableRow, index % 2 === 0 ? themeStyles.rowEven : themeStyles.rowOdd]}>
                <Text style={[themeStyles.tdText, { flex: 0.4, fontWeight: 'bold' }]}>{item.id}</Text>
                <Text style={[themeStyles.tdText, { flex: 0.8, fontSize: 9, color: isDark ? '#94a3b8' : '#6b7280' }]}>SN-ESP32-001</Text>
                <Text style={[themeStyles.tdText, { flex: 0.8, color: isDark ? '#7dd3fc' : '#0284c7', fontWeight: 'bold' }]}>{item.kelembaban}%</Text>
                <Text style={[themeStyles.tdText, { flex: 1, fontSize: 10 }]}>{formatWaktu(item.waktu)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: isDark ? '#64748b' : '#9ca3af' }}>Kosong</Text>}
          />
        </View>

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
});
