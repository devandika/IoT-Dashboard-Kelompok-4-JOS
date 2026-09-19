import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Switch } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Paho from 'paho-mqtt';
import { ThemeContext } from '../../App';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TouchableOpacity } from 'react-native-gesture-handler';

const MQTT_HOST = 'broker.emqx.io';
const MQTT_WS_PORT = 8083; 
const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen() {
    const { isDark } = useContext(ThemeContext);
    const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

    const [suhu, setSuhu] = useState('--');
    const [kelembaban, setKelembaban] = useState('--');
    const [ledStatus, setLedStatus] = useState('OFF');
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState('--:--:--');
    
    const [chartLabels, setChartLabels] = useState(['00:00', '00:00', '00:00', '00:00', '00:00']);
    const [chartSuhu, setChartSuhu] = useState([0, 0, 0, 0, 0]);
    const [chartKelembaban, setChartKelembaban] = useState([0, 0, 0, 0, 0]);

    // Filter states
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date());
    const [avgSuhu, setAvgSuhu] = useState('--');
    const [avgKelembaban, setAvgKelembaban] = useState('--');
    const [serverIp, setServerIp] = useState('');
    const [token, setToken] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    // Device status state
    const [selectedDeviceSN, setSelectedDeviceSN] = useState('SN-ESP32-001');
    const [dashboardDevices, setDashboardDevices] = useState([
        { name: 'ESP32 Main Controller', sn: 'SN-ESP32-001', room: 'Ruang Tamu', status: 'Offline' },
        { name: 'Arduino Sensor Node', sn: 'SN-ARD-002', room: 'Kamar Tidur', status: 'Offline' },
        { name: 'ESP8266 Kitchen Node', sn: 'SN-ESP82-003', room: 'Dapur', status: 'Offline' },
        { name: 'Raspberry Pi Gateway', sn: 'SN-RPI-004', room: 'Teras Depan', status: 'Offline' }
    ]);

    const mqttClientRef = useRef(null);
    const heartbeatTimerRef = useRef(null);
    const isFilterRef = useRef(false); // Ref for mqtt closure access
    const deviceLastSeen = useRef({});
    const selectedDeviceSNRef = useRef('SN-ESP32-001');

    useEffect(() => {
        isFilterRef.current = isFilterActive;
    }, [isFilterActive]);

    useEffect(() => {
        const checkStatus = setInterval(() => {
            const now = Date.now();
            setDashboardDevices(prev => {
                let changed = false;
                const next = prev.map(dev => {
                    const lastSeen = deviceLastSeen.current[dev.sn] || 0;
                    const isOnline = (now - lastSeen <= 5000) && lastSeen > 0;
                    const newStatus = isOnline ? 'Online' : 'Offline';
                    if (dev.status !== newStatus) {
                        changed = true;
                        return { ...dev, status: newStatus };
                    }
                    return dev;
                });
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(checkStatus);
    }, []);

    useEffect(() => {
        const loadCredentials = async () => {
            const ip = await AsyncStorage.getItem('serverIP');
            const tk = await AsyncStorage.getItem('userToken');
            const usrStr = await AsyncStorage.getItem('userData');
            if (ip) setServerIp(ip);
            if (tk) setToken(tk);
            if (usrStr) setCurrentUser(JSON.parse(usrStr));
        };
        loadCredentials();
        const clientID = "MobileApp_" + parseInt(Math.random() * 1000);
        const client = new Paho.Client(MQTT_HOST, MQTT_WS_PORT, "/mqtt", clientID);

        client.onConnectionLost = () => setIsConnected(false);

        client.onMessageArrived = (message) => {
            const topic = message.destinationName;
            const payload = message.payloadString;

            if (topic === 'tugasiot/sensor') {
                try {
                    const data = JSON.parse(payload);
                    const sn = data.sn || 'SN-ESP32-001';
                    deviceLastSeen.current[sn] = Date.now();

                    if (sn === selectedDeviceSNRef.current) {
                        setSuhu(data.suhu);
                        setKelembaban(data.kelembaban);
                        
                        const now = new Date();
                        const timestamp = now.toLocaleTimeString('id-ID');
                        setLastUpdate(`${timestamp}:${now.getSeconds().toString().padStart(2, '0')}`);

                        if (!isFilterRef.current) {
                            setChartLabels(prev => [...prev.slice(1), timestamp]);
                            setChartSuhu(prev => [...prev.slice(1), parseFloat(data.suhu) || 0]);
                            setChartKelembaban(prev => [...prev.slice(1), parseFloat(data.kelembaban) || 0]);
                        }
                    }
                } catch (e) { }
            } else if (topic === 'tugasiot/kontrol_led') {
                setLedStatus(payload);
            }
        };

        client.connect({
            onSuccess: () => {
                setIsConnected(true);
                client.subscribe('tugasiot/sensor');
                client.subscribe('tugasiot/kontrol_led');
            },
            onFailure: () => setIsConnected(false)
        });

        mqttClientRef.current = client;
        return () => { 
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (client.isConnected()) client.disconnect(); 
        };
    }, []);

    // Heartbeat Effect (HTTP PING)
    useEffect(() => {
        if (serverIp && token) {
            const ping = async () => {
                try {
                    const API_URL = `http://${serverIp}:8080`;
                    await axios.post(`${API_URL}/api/auth/ping`, {}, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch(e) {}
            };
            ping(); // Panggil langsung pertama kali
            heartbeatTimerRef.current = setInterval(ping, 2000); // 2 detik sekali
        }
        return () => {
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
        };
    }, [serverIp, token]);

    const fetchFilteredData = async (selectedDate) => {
        if (!serverIp || !token) return;
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const API_URL = `http://${serverIp}:8080`;
            const res = await axios.get(`${API_URL}/api/history/filter?date=${dateStr}&sn=${selectedDeviceSNRef.current}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success && res.data.data.length > 0) {
                const result = res.data;
                setChartLabels(result.data.map(d => d.time_label));
                setChartSuhu(result.data.map(d => d.avg_suhu));
                setChartKelembaban(result.data.map(d => d.avg_hum));
                setAvgSuhu(result.avgTemp);
                setAvgKelembaban(result.avgHum);
            } else {
                setChartLabels(['00:00']); setChartSuhu([0]); setChartKelembaban([0]);
                setAvgSuhu('-'); setAvgKelembaban('-');
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        selectedDeviceSNRef.current = selectedDeviceSN;
        if (isFilterActive) {
            fetchFilteredData(filterDate);
        } else {
            setChartLabels(['00:00', '00:00', '00:00', '00:00', '00:00']);
            setChartSuhu([0, 0, 0, 0, 0]);
            setChartKelembaban([0, 0, 0, 0, 0]);
            setSuhu('--');
            setKelembaban('--');
        }
    }, [selectedDeviceSN]);

    const handleDateChange = (event, selectedDate) => {
        setShowPicker(false);
        if (selectedDate) {
            setFilterDate(selectedDate);
            setIsFilterActive(true);
            fetchFilteredData(selectedDate);
        }
    };

    const resetFilter = () => {
        setIsFilterActive(false);
        setFilterDate(new Date());
        setAvgSuhu('--');
        setAvgKelembaban('--');
        setChartLabels(['00:00', '00:00', '00:00', '00:00', '00:00']);
        setChartSuhu([0, 0, 0, 0, 0]);
        setChartKelembaban([0, 0, 0, 0, 0]);
    };

    const kontrolLED = (statusPerintah) => {
        setLedStatus(statusPerintah);
        if (mqttClientRef.current?.isConnected()) {
            const message = new Paho.Message(statusPerintah);
            message.destinationName = 'tugasiot/kontrol_led';
            mqttClientRef.current.send(message);
        }
    };

    const getStatusSuhu = (val) => {
        const s = parseFloat(val);
        if (isNaN(s)) return { text: 'Unknown', color: isDark ? '#9ca3af' : '#6b7280' };
        if (s > 30) return { text: 'Panas', color: '#ef4444' };
        if (s >= 24) return { text: 'Normal', color: '#10b981' };
        return { text: 'Sejuk', color: '#3b82f6' };
    };

    const chartConfigParams = {
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        backgroundGradientFrom: isDark ? "#1e293b" : "#ffffff",
        backgroundGradientTo: isDark ? "#1e293b" : "#ffffff",
        decimalPlaces: 1,
        color: (opacity = 1) => isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(229, 231, 235, ${opacity})`, 
        labelColor: (opacity = 1) => isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: { r: "4", strokeWidth: "2", stroke: isDark ? "#1e293b" : "#ffffff" }
    };

    return (
        <View style={themeStyles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Text style={themeStyles.mainTitle}>Dashboard IoT</Text>
                    <View style={themeStyles.updateBadge}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color={isDark ? "#94a3b8" : "#6b7280"} />
                        <Text style={themeStyles.updateText}>{lastUpdate}</Text>
                    </View>
                </View>

                <View style={themeStyles.statusBadgeContainer}>
                    <MaterialCommunityIcons name={isConnected ? "lan-connect" : "lan-disconnect"} size={18} color={isConnected ? '#10b981' : '#ef4444'} />
                    <Text style={[styles.statusBadgeText, { color: isConnected ? '#10b981' : '#ef4444' }]}>
                        {isConnected ? `Terhubung ke MQTT Broker` : 'Koneksi MQTT Terputus'}
                    </Text>
                </View>

                <View style={styles.sensorCardsWrapper}>
                    <View style={[themeStyles.sensorCardBox, { backgroundColor: isDark ? '#431407' : '#fffaf0' }]}>
                        <View style={styles.sensorCardHeader}>
                            <MaterialCommunityIcons name="thermometer" size={30} color={isDark ? '#fb923c' : '#f97316'} />
                            <View style={[styles.miniBadge, { backgroundColor: getStatusSuhu(suhu).color }]}>
                                <Text style={styles.miniBadgeText}>{getStatusSuhu(suhu).text}</Text>
                            </View>
                        </View>
                        <Text style={themeStyles.sensorLabel}>Suhu</Text>
                        <Text style={[styles.sensorVal, { color: isDark ? '#fdba74' : '#ea580c' }]}>{suhu}<Text style={styles.sensorUnit}>°C</Text></Text>
                    </View>

                    <View style={[themeStyles.sensorCardBox, { backgroundColor: isDark ? '#082f49' : '#f0f9ff' }]}>
                        <View style={styles.sensorCardHeader}>
                            <MaterialCommunityIcons name="water-percent" size={30} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                        </View>
                        <Text style={themeStyles.sensorLabel}>Kelembaban</Text>
                        <Text style={[styles.sensorVal, { color: isDark ? '#7dd3fc' : '#0284c7' }]}>{kelembaban}<Text style={styles.sensorUnit}>%</Text></Text>
                    </View>
                </View>

                <View style={themeStyles.card}>
                    <View style={styles.cardHeaderRow}>
                        <MaterialCommunityIcons name="chart-bell-curve" size={24} color={isDark ? "#fb923c" : "#ea580c"} />
                        <Text style={themeStyles.cardHeader}>Grafik Data</Text>
                    </View>

                    {/* Filter UI */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                        <TouchableOpacity style={themeStyles.filterBtn} onPress={() => setShowPicker(true)}>
                            <MaterialCommunityIcons name="calendar" size={16} color="#fff" />
                            <Text style={themeStyles.filterBtnText}>
                                {isFilterActive ? filterDate.toISOString().split('T')[0] : "Filter Tanggal"}
                            </Text>
                        </TouchableOpacity>
                        {isFilterActive && (
                            <TouchableOpacity style={themeStyles.resetBtn} onPress={resetFilter}>
                                <MaterialCommunityIcons name="sync" size={16} color="#ef4444" />
                                <Text style={themeStyles.resetBtnText}>Reset ke Realtime</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {showPicker && (
                        <DateTimePicker
                            value={filterDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}

                    {isFilterActive && (
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <View style={[themeStyles.avgBox, { borderColor: '#fb923c' }]}>
                                <Text style={{ fontSize: 10, color: '#fb923c', fontWeight: 'bold' }}>Rata-rata Suhu</Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{avgSuhu}°C</Text>
                            </View>
                            <View style={[themeStyles.avgBox, { borderColor: '#38bdf8' }]}>
                                <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold' }}>Rata-rata Lembab</Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{avgKelembaban}%</Text>
                            </View>
                        </View>
                    )}

                    <Text style={{ textAlign: 'center', marginBottom: 5, color: '#fb923c', fontWeight: 'bold' }}>Suhu (°C)</Text>
                    <View style={styles.chartWrapper}>
                        <LineChart
                            data={{ labels: chartLabels, datasets: [{ data: chartSuhu, color: (o = 1) => `rgba(249, 115, 22, ${o})`, strokeWidth: 3 }] }}
                            width={screenWidth - 60} height={220} yAxisSuffix="°C" verticalLabelRotation={30}
                            chartConfig={chartConfigParams} bezier style={{ borderRadius: 16 }}
                        />
                    </View>

                    <Text style={{ textAlign: 'center', marginBottom: 5, marginTop: 15, color: '#38bdf8', fontWeight: 'bold' }}>Kelembaban (%)</Text>
                    <View style={styles.chartWrapper}>
                        <LineChart
                            data={{ labels: chartLabels, datasets: [{ data: chartKelembaban, color: (o = 1) => `rgba(14, 165, 233, ${o})`, strokeWidth: 3 }] }}
                            width={screenWidth - 60} height={220} yAxisSuffix="%" verticalLabelRotation={30}
                            chartConfig={chartConfigParams} bezier style={{ borderRadius: 16 }}
                        />
                    </View>
                </View>

                <View style={themeStyles.card}>
                    <View style={styles.cardHeaderRow}>
                        <MaterialCommunityIcons name="remote" size={24} color={isDark ? "#60a5fa" : "#2563eb"} />
                        <Text style={themeStyles.cardHeader}>Kendali LED</Text>
                    </View>
                    <View style={[styles.interactiveDeviceCard, themeStyles.deviceOffBox, ledStatus === 'ON' && themeStyles.lampOnGlow]}>
                        <View style={[styles.iconCircle, ledStatus === 'ON' ? themeStyles.bulbCircleOn : themeStyles.iconCircleOff]}>
                            <MaterialCommunityIcons 
                                name={ledStatus === 'ON' ? "lightbulb-on" : "lightbulb-outline"} 
                                size={36} color={ledStatus === 'ON' ? "#d97706" : (isDark ? "#64748b" : "#9ca3af")} 
                            />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={themeStyles.deviceTitle}>Lampu Utama / LED</Text>
                            <Text style={[styles.deviceStatusText, { color: ledStatus === 'ON' ? '#d97706' : (isDark ? '#94a3b8' : '#6b7280') }]}>
                                {ledStatus === 'ON' ? '⚡ Menyala / ON' : '🌙 Padam / OFF'}
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: isDark ? "#475569" : "#d1d5db", true: "#f59e0b" }}
                            thumbColor={ledStatus === 'ON' ? "#ffffff" : (isDark ? "#94a3b8" : "#f4f3f4")}
                            onValueChange={(val) => kontrolLED(val ? 'ON' : 'OFF')} value={ledStatus === 'ON'}
                        />
                    </View>
                </View>

                {/* Status Perangkat (Device Table) */}
                <View style={themeStyles.card}>
                    <View style={[styles.cardHeaderRow, { justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <MaterialCommunityIcons name="server-network" size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
                            <Text style={themeStyles.cardHeader}>Status Perangkat</Text>
                        </View>
                        <View style={{ backgroundColor: dashboardDevices.filter(d => d.status === 'Online').length > 0 ? '#10b981' : '#6b7280', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                                {dashboardDevices.filter(d => d.status === 'Online').length} / {dashboardDevices.length} Online
                            </Text>
                        </View>
                    </View>

                    <View style={{ borderWidth: 1, borderColor: isDark ? '#334155' : '#e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                        {dashboardDevices.map((dev, idx) => {
                            const isSelected = dev.sn === selectedDeviceSN;
                            return (
                                <TouchableOpacity 
                                    key={dev.sn} 
                                    onPress={() => setSelectedDeviceSN(dev.sn)}
                                    style={{
                                        flexDirection: 'row', 
                                        padding: 12, 
                                        backgroundColor: isSelected ? (isDark ? '#1e3a8a' : '#dbeafe') : (idx % 2 === 0 ? (isDark ? '#0f172a' : '#f9fafb') : (isDark ? '#1e293b' : '#ffffff')),
                                        borderBottomWidth: idx < dashboardDevices.length - 1 ? 1 : 0,
                                        borderBottomColor: isDark ? '#334155' : '#e5e7eb'
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: isSelected ? '#2563eb' : (isDark ? '#f8fafc' : '#1f2937') }}>{dev.name}</Text>
                                        <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#6b7280' }}>{dev.sn} • {dev.room}</Text>
                                    </View>
                                    <View style={{ justifyContent: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: dev.status === 'Online' ? '#dcfce7' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dev.status === 'Online' ? '#10b981' : '#ef4444', marginRight: 4 }} />
                                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: dev.status === 'Online' ? '#166534' : '#991b1b' }}>{dev.status}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </View>
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
    deviceStatusText: { fontSize: 12, fontWeight: '700', marginTop: 2 }
});

const getThemeStyles = (isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f3f4f6' },
    mainTitle: { fontSize: 26, fontWeight: '900', color: isDark ? '#f8fafc' : '#111827', letterSpacing: -0.5 },
    updateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#334155' : '#e5e7eb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
    updateText: { fontSize: 12, color: isDark ? '#e2e8f0' : '#4b5563', fontWeight: 'bold' },
    statusBadgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: isDark ? '#1e293b' : '#ffffff', padding: 10, borderRadius: 12, elevation: 1 },
    sensorCardBox: { flex: 1, padding: 16, borderRadius: 20, elevation: 2 },
    sensorLabel: { fontSize: 13, color: isDark ? '#cbd5e1' : '#4b5563', marginTop: 10, marginBottom: 2, fontWeight: '600' },
    card: { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 3 },
    cardHeader: { fontSize: 18, fontWeight: '800', color: isDark ? '#f1f5f9' : '#1f2937' },
    deviceOffBox: { backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderColor: isDark ? '#334155' : '#e5e7eb' },
    lampOnGlow: { backgroundColor: isDark ? '#78350f' : '#fffbeb', borderColor: '#f59e0b' },
    iconCircleOff: { backgroundColor: isDark ? '#334155' : '#e5e7eb' },
    bulbCircleOn: { backgroundColor: isDark ? '#fef3c7' : '#fef3c7' },
    deviceTitle: { fontSize: 15, fontWeight: '800', color: isDark ? '#f8fafc' : '#1f2937' },
    filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5 },
    filterBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5 },
    resetBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
    avgBox: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center' }
});
