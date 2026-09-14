import { createContext } from 'react';
import { StyleSheet } from 'react-native';

export const ThemeContext = createContext();

export const getThemeStyles = (isDark) => StyleSheet.create({
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
  filterBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#1e293b' : '#ffffff', padding: 12, borderRadius: 16, elevation: 1 },
  filterLabel: { fontSize: 13, color: isDark ? '#cbd5e1' : '#4b5563', fontWeight: 'bold' },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: isDark ? '#334155' : '#f3f4f6' },
  tabText: { fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', fontWeight: '700' },
  tableWrapper: { flex: 1, backgroundColor: isDark ? '#1e293b' : '#ffffff', borderRadius: 16, overflow: 'hidden', elevation: 2, marginBottom: 15 },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f3f4f6', alignItems: 'center' },
  rowEven: { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
  rowOdd: { backgroundColor: isDark ? '#0f172a' : '#f9fafb' },
  tdText: { fontSize: 12, color: isDark ? '#cbd5e1' : '#374151', textAlign: 'center' },
  // Modal / User Screen generic styles
  statBox: { flex: 1, padding: 15, borderRadius: 16, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', marginVertical: 4 },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: isDark ? '#94a3b8' : '#6b7280' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e293b' : '#fff', padding: 15, marginBottom: 10, borderRadius: 16, elevation: 2 },
  userName: { fontSize: 16, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1f2937' },
  userRole: { fontSize: 12, color: isDark ? '#94a3b8' : '#6b7280', marginTop: 2 },
  modalContent: { width: '100%', backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 20, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#f8fafc' : '#1f2937', marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: isDark ? '#cbd5e1' : '#4b5563', marginBottom: 5 },
  textInput: { backgroundColor: isDark ? '#0f172a' : '#f9fafb', borderWidth: 1, borderColor: isDark ? '#334155' : '#e5e7eb', borderRadius: 12, padding: 12, color: isDark ? '#f8fafc' : '#1f2937' }
});
