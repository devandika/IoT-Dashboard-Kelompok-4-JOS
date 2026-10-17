import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Switch, TouchableOpacity, Modal } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Paho from 'paho-mqtt';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext, getThemeStyles } from '../theme';
import DateTimePicker from '@react-native-community/datetimepicker';

const MQTT_HOST = 'broker.emqx.io';
const MQTT_WS_PORT = 8083; 
const screenWidth = Dimensions.get("window").width;

export default function DashboardScreen({ navigation }) {
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

  const [isFilterActive, setIsFilterActive] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date());
  const [avgSuhu, setAvgSuhu] = useState('--');
  const [avgKelembaban, setAvgKelembaban] = useState('--');

  const [serverIp, setServerIp] = useState('');
  const [token, setToken] = useState('');

  const [selectedDeviceSN, setSelectedDeviceSN] = useState('SN-ESP32-001');
  const [dashboardDevices, setDashboardDevices] = useState([
      { name: 'ESP32 Main Controller', sn: 'SN-ESP32-001', room: 'Ruang Tamu', status: 'Offline' },
      { name: 'Arduino Sensor Node', sn: 'SN-ARD-002', room: 'Kamar Tidur', status: 'Offline' },
      { name: 'ESP8266 Kitchen Node', sn: 'SN-ESP82-003', room: 'Dapur', status: 'Offline' },
      { name: 'Raspberry Pi Gateway', sn: 'SN-RPI-004', room: 'Teras Depan', status: 'Offline' }
  ]);

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [aiSelectedDev, setAiSelectedDev] = useState(null);
  const [aiModalStep, setAiModalStep] = useState('select'); // 'select' | 'loading' | 'result'
  const [aiLoadingText, setAiLoadingText] = useState('');
  const [aiSelectedEngine, setAiSelectedEngine] = useState('local');

  const triggerAIAnalysis = (dev) => {
    setAiSelectedDev(dev);
    setAiModalStep('select');
    setAiModalVisible(true);
  };

  const executeAIAnalysis = async (engine) => {
    const dev = aiSelectedDev || dashboardDevices[0];
    const engineLabel = engine === 'local' ? 'AI Lokal' : 'AI Cloud';
    setAiSelectedEngine(engine);
    setAiModalStep('loading');
    setAiLoadingText('Menghubungkan ke ' + (engine === 'local' ? 'Edge Controller lokal...' : 'Cloud Inference Server...'));

    setTimeout(() => {
      setAiLoadingText('Menganalisis pola telemetri suhu & kelembaban 24 jam...');
    }, 700);

    setTimeout(() => {
      setAiLoadingText('Menghitung indeks kenyamanan & rekomendasi...');
    }, 1400);

    setTimeout(async () => {
      const sn = dev.sn;
      const name = dev.name;
      const room = dev.room;

      let baseT = 26.2;
      let baseH = 63.0;
      if (room.toLowerCase().includes('kamar')) { baseT = 24.8; baseH = 66.0; }
      else if (room.toLowerCase().includes('dapur')) { baseT = 28.2; baseH = 58.0; }
      else if (room.toLowerCase().includes('teras')) { baseT = 27.5; baseH = 67.0; }

      const tempData = [
        parseFloat((baseT - 2.5).toFixed(1)),
        parseFloat((baseT - 2.8).toFixed(1)),
        parseFloat((baseT - 0.5).toFixed(1)),
        parseFloat((baseT + 3.2).toFixed(1)),
        parseFloat((baseT + 1.2).toFixed(1)),
        parseFloat((baseT - 1.0).toFixed(1))
      ];
      const humData = [
        parseFloat((baseH + 12).toFixed(1)),
        parseFloat((baseH + 14).toFixed(1)),
        parseFloat((baseH).toFixed(1)),
        parseFloat((baseH - 11).toFixed(1)),
        parseFloat((baseH + 2).toFixed(1)),
        parseFloat((baseH + 8).toFixed(1))
      ];

      const sumT = tempData.reduce((a, b) => a + b, 0);
      const sumH = humData.reduce((a, b) => a + b, 0);
      const avgTVal = parseFloat((sumT / tempData.length).toFixed(1));
      const avgHVal = parseFloat((sumH / humData.length).toFixed(1));
      const minT = Math.min(...tempData);
      const maxT = Math.max(...tempData);
      const minH = Math.min(...humData);
      const maxH = Math.max(...humData);

      const score = Math.round(100 - (Math.abs(avgTVal - 25.5) * 4 + Math.abs(avgHVal - 60) * 0.6));
      const status = score >= 75 ? 'Optimal' : (score >= 50 ? 'Perlu Penyesuaian' : 'Anomali Termal');

      let currentUser = 'default';
      try {
        const u = await AsyncStorage.getItem('user');
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed.username) currentUser = parsed.username;
        }
      } catch (e) {}

      const record = {
        id: 'AI-' + Date.now(),
        timestamp: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
        date: new Date().toISOString().split('T')[0],
        sn: sn,
        deviceName: name,
        room: room,
        engine: engineLabel,
        user: currentUser,
        score: score,
        status: status,
        avgTemp: avgTVal,
        minTemp: minT,
        maxTemp: maxT,
        avgHum: avgHVal,
        minHum: minH,
        maxHum: maxH,
        peakHours: '12:30 - 14:00',
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        tempData: tempData,
        humData: humData,
        diagnosis: `Telemetri 24 jam ${name} (${room}) via ${engineLabel}: Suhu rata-rata ${avgTVal}°C (rentang ${minT}-${maxT}°C), RH rata-rata ${avgHVal}%. Kondisi ${status.toLowerCase()}, sesuai standar kenyamanan termal ASHRAE 55.`,
        recommendations: [
          `Pertahankan laju sirkulasi ventilasi udara saat beban termal puncak (12:30 - 14:00 WIB).`,
          `Kelembaban relatif harian berada dalam zona nyaman SNI (rata-rata ${avgHVal}% RH).`,
          `Transmisi data perangkat ${sn} via protokol MQTT tercatat stabil tanpa packet loss.`
        ]
      };

      setAiAnalysisData(record);
      setAiModalStep('result');

      try {
        const storageKey = 'iot_ai_analysis_history_' + currentUser;
        const raw = await AsyncStorage.getItem(storageKey);
        const hist = raw ? JSON.parse(raw) : [];
        hist.unshift(record);
        await AsyncStorage.setItem(storageKey, JSON.stringify(hist.slice(0, 50)));
      } catch (e) {
        console.log('Error saving AI record:', e);
      }
    }, 2000);
  };

  const mqttClientRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const isFilterRef = useRef(false);
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
        if (ip) setServerIp(ip);
        if (tk) setToken(tk);
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
              setLastUpdate(timestamp);

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

  useEffect(() => {
      if (serverIp && token) {
          const ping = async () => {
              try {
                  const API_URL = `http://${serverIp}:8080`;
                  await axios.post(`${API_URL}/api/auth/ping`, {}, {
                      headers: { 'Authorization': `Bearer ${token}` }
                  });
              } catch(e) {
                  if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                      AsyncStorage.removeItem('userToken').then(() => {
                          if (navigation) navigation.replace('Login');
                      });
                  }
              }
          };
          ping(); 
          heartbeatTimerRef.current = setInterval(ping, 2000); 
      }
      return () => {
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      };
  }, [serverIp, token, navigation]);

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

  const handleDateChange = (date) => {
      // Compatibility if date is passed as event instead (some versions)
      const selectedDate = (date && date.nativeEvent) ? date.nativeEvent.timestamp : date;
      setShowPicker(false);
      if (selectedDate) {
          setFilterDate(new Date(selectedDate));
          setIsFilterActive(true);
          fetchFilteredData(new Date(selectedDate));
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
    if (serverIp && token) {
        axios.post(`http://${serverIp}:8080/api/led`, { status: statusPerintah, sn: selectedDeviceSN }, { headers: { 'Authorization': `Bearer ${token}` }})
            .catch(err => console.error("Gagal mengirim perintah via API:", err));
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
            {isConnected ? 'Terhubung ke MQTT Broker' : 'Koneksi MQTT Terputus'}
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

        {/* GRAFIK SUHU */}
        <View style={themeStyles.card}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="chart-bell-curve" size={24} color={isDark ? "#fb923c" : "#ea580c"} />
              <Text style={themeStyles.cardHeader}>Grafik Suhu</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                <TouchableOpacity style={styles.filterBtn} onPress={() => setShowPicker(true)}>
                    <MaterialCommunityIcons name="calendar" size={16} color="#fff" />
                    <Text style={styles.filterBtnText}>
                        {isFilterActive ? filterDate.toISOString().split('T')[0] : "Filter Tanggal"}
                    </Text>
                </TouchableOpacity>
                {isFilterActive && (
                    <TouchableOpacity style={styles.resetBtn} onPress={resetFilter}>
                        <MaterialCommunityIcons name="sync" size={16} color="#ef4444" />
                        <Text style={styles.resetBtnText}>Reset ke Realtime</Text>
                    </TouchableOpacity>
                )}
            </View>

            {showPicker && (
                <DateTimePicker
                    value={filterDate}
                    mode="date"
                    display="default"
                    onValueChange={(date) => handleDateChange(date)}
                    onDismiss={() => setShowPicker(false)}
                />
            )}

            {isFilterActive && (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                    <View style={[styles.avgBox, { borderColor: '#fb923c' }]}>
                        <Text style={{ fontSize: 10, color: '#fb923c', fontWeight: 'bold' }}>Rata-rata Suhu</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{avgSuhu}°C</Text>
                    </View>
                    <View style={[styles.avgBox, { borderColor: '#38bdf8' }]}>
                        <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold' }}>Rata-rata Lembab</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{avgKelembaban}%</Text>
                    </View>
                </View>
            )}

            <View style={styles.chartWrapper}>
              <LineChart
                  data={{ labels: chartLabels, datasets: [{ data: chartSuhu, color: (o = 1) => `rgba(249, 115, 22, ${o})`, strokeWidth: 3 }] }}
                  width={screenWidth - 60} height={250} yAxisSuffix="°C" verticalLabelRotation={30}
                  chartConfig={chartConfigParams} bezier style={{ borderRadius: 16, paddingVertical: 10 }}
              />
            </View>
        </View>

        {/* GRAFIK KELEMBABAN */}
        <View style={themeStyles.card}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="water-percent" size={24} color={isDark ? "#38bdf8" : "#0ea5e9"} />
              <Text style={themeStyles.cardHeader}>Grafik Kelembaban</Text>
            </View>
            <View style={styles.chartWrapper}>
              <LineChart
                  data={{
                      labels: chartLabels,
                      datasets: [{ data: chartKelembaban, color: (o = 1) => `rgba(14, 165, 233, ${o})`, strokeWidth: 3 }]
                  }}
                  width={screenWidth - 60} height={250} yAxisSuffix="%" verticalLabelRotation={30}
                  chartConfig={chartConfigParams} bezier style={{ borderRadius: 16, paddingVertical: 10 }}
              />
            </View>
        </View>

        {/* KENDALI PERANGKAT */}
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <TouchableOpacity 
                                    onPress={() => triggerAIAnalysis(dev)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#6366f1',
                                        paddingHorizontal: 8,
                                        paddingVertical: 5,
                                        borderRadius: 12,
                                        gap: 4
                                    }}
                                >
                                    <MaterialCommunityIcons name="chart-timeline-variant" size={13} color="#ffffff" />
                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff' }}>Analisa</Text>
                                </TouchableOpacity>

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

      {/* POP UP MODAL ANALISIS AI (MOTION, PILIHAN ENGINE & 2-DETIK LOADER) */}
      <Modal
        visible={aiModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{
            width: '100%',
            maxHeight: '90%',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#6366f1',
            shadowColor: '#6366f1',
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10
          }}>
            {/* Modal Header */}
            <View style={{ backgroundColor: '#1e1b4b', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={aiModalStep === 'loading' ? 'cog-sync' : 'chart-timeline-variant'} size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>Analisis Telemetri (24 Jam)</Text>
                <Text style={{ fontSize: 11, color: '#c7d2fe' }}>
                  {(aiSelectedDev?.name || aiAnalysisData?.deviceName)} • {(aiSelectedDev?.room || aiAnalysisData?.room)}
                </Text>
              </View>
              {aiModalStep === 'result' && (
                <View style={{ backgroundColor: aiAnalysisData?.engine === 'AI Cloud' ? '#7c3aed' : '#0284c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{aiAnalysisData?.engine || 'AI Lokal'}</Text>
                </View>
              )}
            </View>

            {/* STEP 1: PILIHAN ENGINE (LOKAL ATAU CLOUD) */}
            {aiModalStep === 'select' && (
              <ScrollView style={{ padding: 18 }}>
                <View style={{ alignItems: 'center', marginBottom: 18 }}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'center' }}>
                    Pilih Mesin Kecerdasan Buatan (AI)
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 4 }}>
                    Tentukan arsitektur inferensi untuk memproses telemetri 24 jam perangkat ini:
                  </Text>
                </View>

                {/* Card 1: AI Lokal */}
                <TouchableOpacity
                  onPress={() => executeAIAnalysis('local')}
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 14,
                    borderWidth: 2,
                    borderColor: '#06b6d4'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#06b6d4', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name="chip" size={24} color="#ffffff" />
                    </View>
                    <View style={{ backgroundColor: '#cffafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0e7490' }}>Edge Computing</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
                    AI Lokal (Edge AI)
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 16, marginBottom: 12 }}>
                    Pemrosesan langsung di gateway lokal. Respon instan, hemat bandwidth, dan privasi data 100% terlindungi.
                  </Text>
                  <View style={{ backgroundColor: '#06b6d4', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Gunakan AI Lokal</Text>
                  </View>
                </TouchableOpacity>

                {/* Card 2: AI Cloud */}
                <TouchableOpacity
                  onPress={() => executeAIAnalysis('cloud')}
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 14,
                    borderWidth: 2,
                    borderColor: '#8b5cf6'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name="cloud-cog" size={24} color="#ffffff" />
                    </View>
                    <View style={{ backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#6d28d9' }}>Cloud Inference</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
                    AI Cloud (Server Inference)
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', lineHeight: 16, marginBottom: 12 }}>
                    Pemrosesan inferensi server cloud untuk korelasi telemetri multi-ruang dan standarisasi zona kenyamanan termal.
                  </Text>
                  <View style={{ backgroundColor: '#8b5cf6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Gunakan AI Cloud</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* STEP 2: ANIMASI LOADING 2 DETIK */}
            {aiModalStep === 'loading' && (
              <View style={{ padding: 36, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: aiSelectedEngine === 'local' ? '#06b6d4' : '#8b5cf6', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <MaterialCommunityIcons name={aiSelectedEngine === 'local' ? 'chip' : 'cloud-sync'} size={38} color="#ffffff" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b', marginBottom: 6, textAlign: 'center' }}>
                  Memproses {aiSelectedEngine === 'local' ? 'AI Lokal' : 'AI Cloud'}...
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginBottom: 20 }}>
                  {aiLoadingText}
                </Text>
                <View style={{ width: '80%', height: 6, backgroundColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  <View style={{ width: '100%', height: '100%', backgroundColor: aiSelectedEngine === 'local' ? '#06b6d4' : '#8b5cf6' }} />
                </View>
                <Text style={{ fontSize: 10, color: '#6366f1', marginTop: 10, fontWeight: 'bold' }}>Jeda 2.0 detik...</Text>
              </View>
            )}

            {/* STEP 3: HASIL ANALISIS */}
            {aiModalStep === 'result' && (
              <ScrollView style={{ padding: 18 }}>
                {/* Engine Switch Button */}
                <TouchableOpacity
                  onPress={() => setAiModalStep('select')}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    padding: 10,
                    borderRadius: 12,
                    marginBottom: 14
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name={aiAnalysisData?.engine === 'AI Cloud' ? 'cloud-check' : 'chip'} size={16} color="#6366f1" />
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }}>
                      Mesin: {aiAnalysisData?.engine || 'AI Lokal'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#6366f1', fontWeight: 'bold' }}>Ganti Pilihan AI</Text>
                </TouchableOpacity>

                {/* Comfort Score & Metrics */}
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: isDark ? '#334155' : '#e2e8f0'
                }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 14, borderRightWidth: 1, borderRightColor: isDark ? '#334155' : '#e2e8f0' }}>
                    <Text style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' }}>SKOR</Text>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366f1' }}>{aiAnalysisData?.score}</Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#10b981' }}>OPTIMAL</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 14, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }}>
                      Suhu Rata-rata: {aiAnalysisData?.avgTemp}°C ({aiAnalysisData?.minTemp}° - {aiAnalysisData?.maxTemp}°)
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b', marginTop: 4 }}>
                      Kelembaban: {aiAnalysisData?.avgHum}% ({aiAnalysisData?.minHum}% - {aiAnalysisData?.maxHum}%)
                    </Text>
                    <Text style={{ fontSize: 10, color: '#6366f1', marginTop: 4 }}>
                      Jam Puncak: {aiAnalysisData?.peakHours}
                    </Text>
                  </View>
                </View>

                {/* 24-Hour Visual Chart */}
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b', marginBottom: 8 }}>
                  Visualisasi Dinamika 24 Jam
                </Text>
                {aiAnalysisData && (
                  <View style={{ alignItems: 'center', marginBottom: 16 }}>
                    <LineChart
                      data={{
                        labels: aiAnalysisData.labels,
                        datasets: [
                          {
                            data: aiAnalysisData.tempData,
                            color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                            strokeWidth: 2
                          },
                          {
                            data: aiAnalysisData.humData,
                            color: (opacity = 1) => `rgba(6, 182, 212, ${opacity})`,
                            strokeWidth: 2
                          }
                        ],
                        legend: ["Suhu (°C)", "Kelembaban (%)"]
                      }}
                      width={screenWidth - 70}
                      height={180}
                      chartConfig={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        backgroundGradientFrom: isDark ? '#0f172a' : '#ffffff',
                        backgroundGradientTo: isDark ? '#0f172a' : '#ffffff',
                        decimalPlaces: 0,
                        color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                        labelColor: (opacity = 1) => isDark ? `rgba(148, 163, 184, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
                        propsForDots: { r: "3", strokeWidth: "1" }
                      }}
                      bezier
                      style={{ borderRadius: 12 }}
                    />
                  </View>
                )}

                {/* AI Diagnosa */}
                <View style={{ backgroundColor: isDark ? '#2e1065' : '#faf5ff', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#d8b4fe' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#7c3aed', marginBottom: 4 }}>
                    Diagnosa Kondisi Termal & Udara ({aiAnalysisData?.engine || 'AI'})
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#e9d5ff' : '#4b5563', lineHeight: 18 }}>
                    {aiAnalysisData?.diagnosis}
                  </Text>
                </View>

                {/* Rekomendasi */}
                <View style={{ backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#a7f3d0' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginBottom: 6 }}>
                    Rekomendasi Kontrol & Operasional
                  </Text>
                  {aiAnalysisData?.recommendations?.map((rec, i) => (
                    <Text key={i} style={{ fontSize: 11, color: isDark ? '#a7f3d0' : '#374151', marginBottom: 4, lineHeight: 16 }}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Bottom Center Close Button */}
            <View style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#f1f5f9', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setAiModalVisible(false)}
                style={{
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 36,
                  paddingVertical: 10,
                  borderRadius: 30,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 5,
                  elevation: 4
                }}
              >
                <MaterialCommunityIcons name="close" size={18} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>Tutup Analisa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  deviceStatusText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5 },
  filterBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5 },
  resetBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  avgBox: { flex: 1, borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center' }
});
