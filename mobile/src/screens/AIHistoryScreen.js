import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext, getThemeStyles } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function AIHistoryScreen() {
  const { isDark } = useContext(ThemeContext);
  const themeStyles = useMemo(() => getThemeStyles(isDark), [isDark]);

  const [currentUser, setCurrentUser] = useState('default');
  const [historyList, setHistoryList] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadHistory = async () => {
    try {
      let username = 'default';
      const u = await AsyncStorage.getItem('user');
      if (u) {
        try {
          const parsed = JSON.parse(u);
          if (parsed.username) username = parsed.username;
        } catch(e) {}
      }
      setCurrentUser(username);

      const storageKey = 'iot_ai_analysis_history_' + username;
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        setHistoryList(JSON.parse(raw));
      } else {
        // Sample default records for mobile preview
        const initial = [
          {
            id: 'AI-' + Date.now() + '-1',
            timestamp: new Date().toLocaleDateString('id-ID') + ' 11:30',
            date: new Date().toISOString().split('T')[0],
            sn: 'SN-ESP32-001',
            deviceName: 'ESP32 Main Controller',
            room: 'Ruang Tamu',
            engine: 'AI Lokal',
            user: username,
            score: 91,
            status: 'Kondisi Optimal',
            avgTemp: 26.2,
            minTemp: 23.4,
            maxTemp: 29.8,
            avgHum: 62.5,
            minHum: 52.0,
            maxHum: 76.0,
            peakHours: '13:00 - 14:00',
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            tempData: [24.2, 23.4, 26.5, 29.8, 27.4, 25.1],
            humData: [74.0, 76.0, 62.0, 52.0, 65.0, 72.8],
            diagnosis: `Telemetri 24 jam ESP32 Main Controller (Ruang Tamu) via AI Lokal: Suhu rata-rata 26.2°C (rentang 23.4-29.8°C), RH rata-rata 62.5%. Kondisi optimal sesuai standar kenyamanan termal SNI 03-6572.`,
            recommendations: [
              'Parameter suhu Ruang Tamu terjaga stabil di bawah ambang batas 27°C, pertahankan laju sirkulasi udara saat ini.',
              'Kelembaban udara terkontrol seimbang pada zona nyaman 50% - 70% RH.',
              'Transmisi data perangkat SN-ESP32-001 konsisten via MQTT tanpa packet loss.'
            ]
          },
          {
            id: 'AI-' + Date.now() + '-2',
            timestamp: new Date().toLocaleDateString('id-ID') + ' 09:15',
            date: new Date().toISOString().split('T')[0],
            sn: 'SN-ARD-002',
            deviceName: 'Arduino Sensor Node',
            room: 'Kamar Tidur',
            engine: 'AI Cloud',
            user: username,
            score: 87,
            status: 'Kondisi Optimal',
            avgTemp: 24.9,
            minTemp: 22.8,
            maxTemp: 27.5,
            avgHum: 67.2,
            minHum: 57.0,
            maxHum: 78.5,
            peakHours: '14:00 - 15:00',
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            tempData: [23.5, 22.8, 24.9, 27.1, 25.6, 24.0],
            humData: [76.0, 78.5, 66.0, 58.0, 68.0, 75.5],
            diagnosis: `Telemetri 24 jam Arduino Sensor Node (Kamar Tidur) via AI Cloud: Suhu rata-rata 24.9°C (rentang 22.8-27.5°C), RH rata-rata 67.2%. Kondisi termal sejuk memenuhi standar tidur higienis ASHRAE 55.`,
            recommendations: [
              'Temperatur sangat menunjang standar higienis istirahat malam hari (22-25°C).',
              'Kelembaban fajar mencapai 78.5%; buka ventilasi jendela antara 06:30 - 08:00 WIB untuk pertukaran udara segar.',
              'Sensor DHT22 beroperasi pada deviasi kalibrasi stabil di bawah toleransi 2%.'
            ]
          }
        ];
        await AsyncStorage.setItem(storageKey, JSON.stringify(initial));
        setHistoryList(initial);
      }
    } catch (e) {
      console.log('Error loading AI history in mobile:', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredHistory = historyList.filter(item => {
    if (selectedDevice === 'ALL') return true;
    return item.sn === selectedDevice;
  });

  const openDetail = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
  };

  const clearHistory = async () => {
    Alert.alert(
      'Hapus Riwayat',
      `Apakah Anda yakin ingin menghapus semua riwayat analisa AI untuk akun ${currentUser}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus',
          style: 'destructive',
          onPress: async () => {
            const storageKey = 'iot_ai_analysis_history_' + currentUser;
            await AsyncStorage.setItem(storageKey, JSON.stringify([]));
            setHistoryList([]);
          }
        }
      ]
    );
  };

  const devices = [
    { label: 'Semua', sn: 'ALL' },
    { label: 'Ruang Tamu', sn: 'SN-ESP32-001' },
    { label: 'Kamar Tidur', sn: 'SN-ARD-002' },
    { label: 'Dapur', sn: 'SN-ESP82-003' },
    { label: 'Teras', sn: 'SN-RPI-004' }
  ];

  return (
    <View style={themeStyles.container}>
      {/* Header Bar */}
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={themeStyles.mainTitle}>Riwayat Analisa AI</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <MaterialCommunityIcons name="account-circle" size={14} color="#6366f1" />
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6366f1' }}>
                Pengguna: {currentUser}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearHistory} style={{ padding: 6 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Device Filter Horizontal Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {devices.map(d => {
              const active = selectedDevice === d.sn;
              return (
                <TouchableOpacity
                  key={d.sn}
                  onPress={() => setSelectedDevice(d.sn)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active ? '#6366f1' : (isDark ? '#1e293b' : '#f1f5f9'),
                    borderWidth: 1,
                    borderColor: active ? '#6366f1' : (isDark ? '#334155' : '#e2e8f0')
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: active ? '#fff' : (isDark ? '#cbd5e1' : '#475569') }}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* History List */}
      <FlatList
        data={filteredHistory}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 60 }}>
            <MaterialCommunityIcons name="brain" size={54} color={isDark ? '#475569' : '#cbd5e1'} />
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#94a3b8' : '#6b7280', marginTop: 12 }}>
              Belum ada riwayat analisa
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#64748b' : '#9ca3af', textAlign: 'center', marginTop: 4 }}>
              Klik tombol 'Analisa' pada tabel perangkat di Dashboard.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openDetail(item)}
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#e2e8f0',
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="chip" size={16} color="#6366f1" />
                <Text style={{ fontWeight: 'bold', fontSize: 14, color: isDark ? '#f8fafc' : '#1e293b' }}>
                  {item.deviceName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: item.engine === 'AI Cloud' ? '#ede9fe' : '#e0f2fe', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.engine === 'AI Cloud' ? '#6d28d9' : '#0369a1' }}>
                    {item.engine || 'AI Lokal'}
                  </Text>
                </View>
                <View style={{ backgroundColor: item.score >= 85 ? '#dcfce7' : '#e0e7ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.score >= 85 ? '#166534' : '#3730a3' }}>
                    Skor {item.score}/100
                  </Text>
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 10 }}>
              {item.room} • {item.sn} • {item.timestamp}
            </Text>

            <View style={{ flexDirection: 'row', gap: 15, backgroundColor: isDark ? '#0f172a' : '#f8fafc', padding: 10, borderRadius: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#6b7280' }}>Suhu Rata-rata (24j)</Text>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#f59e0b', marginTop: 2 }}>
                  {item.avgTemp}°C
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#6b7280' }}>Kelembaban Rata-rata</Text>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#06b6d4', marginTop: 2 }}>
                  {item.avgHum}%
                </Text>
              </View>
            </View>

            <Text numberOfLines={2} style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', marginTop: 10, lineHeight: 18 }}>
              {item.diagnosis}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, gap: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6366f1' }}>Lihat Visualisasi</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#6366f1" />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* POP UP DETAIL MODAL (LARGE WITH BOTTOM CENTER CLOSE BUTTON) */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDetail}
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
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>Detail Analisis Telemetri (24 Jam)</Text>
                <Text style={{ fontSize: 11, color: '#c7d2fe' }}>
                  {selectedRecord?.deviceName} • {selectedRecord?.room}
                </Text>
              </View>
              <View style={{ backgroundColor: selectedRecord?.engine === 'AI Cloud' ? '#7c3aed' : '#0284c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{selectedRecord?.engine || 'AI Lokal'}</Text>
              </View>
            </View>

            {/* Modal Scroll Content */}
            <ScrollView style={{ padding: 18 }}>
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
                  <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#6366f1' }}>{selectedRecord?.score}</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#10b981' }}>OPTIMAL</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 14, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b' }}>
                    Suhu: {selectedRecord?.avgTemp}°C (Min: {selectedRecord?.minTemp}° Max: {selectedRecord?.maxTemp}°)
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b', marginTop: 4 }}>
                    Kelembaban: {selectedRecord?.avgHum}% (Min: {selectedRecord?.minHum}% Max: {selectedRecord?.maxHum}%)
                  </Text>
                  <Text style={{ fontSize: 10, color: '#6366f1', marginTop: 4 }}>
                    Jam Puncak: {selectedRecord?.peakHours || '13:00 - 14:00'}
                  </Text>
                </View>
              </View>

              {/* 24-Hour Visual Chart */}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1e293b', marginBottom: 8 }}>
                Visualisasi Dinamika 24 Jam
              </Text>
              {selectedRecord && (
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <LineChart
                    data={{
                      labels: selectedRecord.labels || ['00:00', '06:00', '12:00', '18:00', '23:00'],
                      datasets: [
                        {
                          data: selectedRecord.tempData || [24, 23, 30, 27, 24],
                          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                          strokeWidth: 2
                        },
                        {
                          data: selectedRecord.humData || [75, 78, 52, 65, 74],
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
                  Diagnosa Kondisi Termal & Udara
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#e9d5ff' : '#4b5563', lineHeight: 18 }}>
                  {selectedRecord?.diagnosis}
                </Text>
              </View>

              {/* Rekomendasi */}
              <View style={{ backgroundColor: isDark ? '#064e3b' : '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#a7f3d0' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginBottom: 6 }}>
                  Rekomendasi Kontrol & Operasional
                </Text>
                {selectedRecord?.recommendations?.map((rec, i) => (
                  <Text key={i} style={{ fontSize: 11, color: isDark ? '#a7f3d0' : '#374151', marginBottom: 4, lineHeight: 16 }}>
                    • {rec}
                  </Text>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Center Close Button */}
            <View style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#f1f5f9', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={closeDetail}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  }
});
