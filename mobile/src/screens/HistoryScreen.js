import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { ThemeContext } from '../../App';

// Ganti IP ini dengan IP Localhost XAMPP komputer Anda
export default function HistoryScreen() {
    const { isDark } = useContext(ThemeContext);
    const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

    const [histori, setHistori] = useState([]);
    const [token, setToken] = useState(null);
    const [serverIp, setServerIp] = useState('192.168.43.196');
    const [filterLimit, setFilterLimit] = useState('25'); 
    const [lastUpdate, setLastUpdate] = useState('--:--:--');
    const [dbStatus, setDbStatus] = useState('menghubungkan...');

    const loadData = async () => {
        try {
            const t = await AsyncStorage.getItem('userToken');
            const ip = await AsyncStorage.getItem('serverIP');
            if (t) setToken(t);
            if (ip) setServerIp(ip);
        } catch (e) {
            console.log(e);
        }
    };

    const ambilDataHistori = async () => {
        try {
            const API_URL = `http://${serverIp}:8080`;
            const response = await axios.get(`${API_URL}/api/history?limit=${filterLimit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setHistori(response.data.data);
            setLastUpdate(new Date().toLocaleTimeString('id-ID'));
            setDbStatus('Terhubung ke Server');
        } catch (error) {
            setDbStatus('Gagal Memuat API');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        ambilDataHistori();
        const interval = setInterval(ambilDataHistori, 2000);
        return () => clearInterval(interval);
    }, [filterLimit, serverIp]);

    const formatWaktu = (waktuStr) => {
        if (!waktuStr) return `-`; 
        const date = new Date(waktuStr);
        return `${date.toLocaleDateString('id-ID')}\n${date.toLocaleTimeString('id-ID')}`;
    };

    return (
        <View style={themeStyles.container}>
            <View style={{ padding: 20, paddingBottom: 10 }}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={themeStyles.mainTitle}>Histori Data</Text>
                        <Text style={{fontSize: 10, color: dbStatus.includes('Gagal') ? '#ef4444' : '#10b981'}}>{dbStatus}</Text>
                    </View>
                    <View style={themeStyles.updateBadge}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={isDark ? "#94a3b8" : "#6b7280"} />
                        <Text style={themeStyles.updateText}>{lastUpdate}</Text>
                    </View>
                </View>
                
                <View style={themeStyles.filterBox}>
                    <Text style={themeStyles.filterLabel}>Tampilkan Data:</Text>
                    <View style={styles.filterTabs}>
                        {['5', '25', '50', '100'].map((limit) => (
                            <TouchableOpacity key={limit} style={[themeStyles.tabBtn, filterLimit === limit && styles.tabBtnActive]} onPress={() => setFilterLimit(limit)}>
                                <Text style={[themeStyles.tabText, filterLimit === limit && styles.tabTextActive]}>{limit}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
            
            <View style={themeStyles.tableWrapper}>
                <View style={themeStyles.tableHeader}>
                    <Text style={[styles.thText, { flex: 0.6 }]}>ID</Text>
                    <Text style={[styles.thText, { flex: 1.5 }]}>Waktu</Text>
                    <Text style={[styles.thText, { flex: 1 }]}>Suhu</Text>
                    <Text style={[styles.thText, { flex: 1.3 }]}>Kelembaban</Text>
                    <Text style={[styles.thText, { flex: 0.8 }]}>LED</Text>
                </View>

                <FlatList
                    data={histori}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item, index }) => (
                        <View style={[themeStyles.tableRow, index % 2 === 0 ? themeStyles.rowEven : themeStyles.rowOdd]}>
                            <Text style={[themeStyles.tdText, { flex: 0.6, fontWeight: 'bold' }]}>{item.id}</Text>
                            <Text style={[themeStyles.tdText, { flex: 1.5, fontSize: 10 }]}>{formatWaktu(item.waktu)}</Text>
                            <Text style={[themeStyles.tdText, { flex: 1, color: isDark ? '#fdba74' : '#ea580c', fontWeight: 'bold' }]}>{item.suhu}°C</Text>
                            <Text style={[themeStyles.tdText, { flex: 1.3, color: isDark ? '#7dd3fc' : '#0284c7', fontWeight: 'bold' }]}>{item.kelembaban}%</Text>
                            <View style={[{ flex: 0.8, alignItems: 'center' }]}>
                                <View style={[styles.badgeWeb, { backgroundColor: item.status_led === 1 || item.status_led === 'ON' ? (isDark ? '#064e3b' : '#dcfce7') : (isDark ? '#7f1d1d' : '#fee2e2') }]}>
                                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: item.status_led === 1 || item.status_led === 'ON' ? (isDark ? '#34d399' : '#166534') : (isDark ? '#f87171' : '#991b1b') }}>
                                        {item.status_led === 1 || item.status_led === 'ON' ? 'ON' : 'OFF'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 30, color: isDark ? '#64748b' : '#9ca3af' }}>Tidak ada data.</Text>}
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

const getThemeStyles = (isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f3f4f6' },
    mainTitle: { fontSize: 26, fontWeight: '900', color: isDark ? '#f8fafc' : '#111827', letterSpacing: -0.5 },
    updateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#334155' : '#e5e7eb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
    updateText: { fontSize: 12, color: isDark ? '#e2e8f0' : '#4b5563', fontWeight: 'bold' },
    filterBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1e293b' : '#ffffff', padding: 12, borderRadius: 16, elevation: 1 },
    filterLabel: { fontSize: 13, color: isDark ? '#cbd5e1' : '#4b5563', fontWeight: 'bold' },
    tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: isDark ? '#334155' : '#f3f4f6' },
    tabText: { fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', fontWeight: '700' },
    tableWrapper: { flex: 1, marginHorizontal: 20, backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 20, overflow: 'hidden', elevation: 2 },
    tableHeader: { flexDirection: 'row', backgroundColor: isDark ? '#020617' : '#1e293b', paddingVertical: 14, paddingHorizontal: 15 },
    tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f3f4f6', alignItems: 'center' },
    rowEven: { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
    rowOdd: { backgroundColor: isDark ? '#0f172a' : '#f9fafb' },
    tdText: { fontSize: 12, color: isDark ? '#cbd5e1' : '#374151', textAlign: 'center' }
});
