import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
    const [serverIp, setServerIp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const loadSavedIp = async () => {
            const savedIp = await AsyncStorage.getItem('serverIP');
            if (savedIp) setServerIp(savedIp);
            else setServerIp('192.168.43.196');
        };
        loadSavedIp();
    }, []);

    const handleRegister = async () => {
        if (!serverIp || !username || !password || !confirmPassword) {
            Alert.alert('Error', 'Semua kolom wajib diisi');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Konfirmasi password tidak cocok');
            return;
        }

        try {
            const API_URL = `http://${serverIp}:8080`;
            const res = await axios.post(`${API_URL}/api/auth/register`, { username, password, role: 'User' });
            if (res.data.success) {
                await AsyncStorage.setItem('serverIP', serverIp);
                await AsyncStorage.setItem('userToken', res.data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
                Alert.alert('Sukses', 'Registrasi berhasil!', [
                    { text: 'OK', onPress: () => navigation.replace('Main') }
                ]);
            }
        } catch (error) {
            const msg = error.response ? error.response.data.message : 'Koneksi ke server gagal.';
            Alert.alert('Registrasi Gagal', msg);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="account-plus" size={60} color="#2563eb" />
                </View>
                <Text style={styles.title}>Buat Akun Baru</Text>
                <Text style={styles.subtitle}>Daftar untuk mengakses IoT Dashboard.</Text>

                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="server-network" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="IP Server" 
                        value={serverIp} 
                        onChangeText={setServerIp} 
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Username" 
                        value={username} 
                        onChangeText={setUsername} 
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Password" 
                        secureTextEntry 
                        value={password} 
                        onChangeText={setPassword} 
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-check" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput 
                        style={styles.input} 
                        placeholder="Konfirmasi Password" 
                        secureTextEntry 
                        value={confirmPassword} 
                        onChangeText={setConfirmPassword} 
                    />
                </View>

                <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
                    <Text style={styles.registerBtnText}>Daftar Sekarang</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkBtnText}>Sudah punya akun? Login di sini.</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        padding: 20
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#ffffff',
        padding: 30,
        borderRadius: 24,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 30
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 15,
        paddingHorizontal: 15
    },
    inputIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151'
    },
    registerBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15
    },
    registerBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    linkBtn: {
        alignItems: 'center'
    },
    linkBtnText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: 'bold'
    }
});
