import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function LoginScreen({ navigation }) {
    const [serverIp, setServerIp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const loadSavedIp = async () => {
            const savedIp = await AsyncStorage.getItem('serverIP');
            if (savedIp) setServerIp(savedIp);
            else setServerIp('192.168.43.196'); // Default dummy IP
        };
        loadSavedIp();
    }, []);

    const handleLogin = async () => {
        if (!serverIp || !username || !password) {
            Alert.alert('Error', 'IP Server, Username dan password wajib diisi');
            return;
        }

        try {
            const API_URL = `http://${serverIp}:8080`;
            const res = await axios.post(`${API_URL}/api/auth/login`, { username, password });
            if (res.data.success) {
                // Simpan token & IP ke storage
                await AsyncStorage.setItem('serverIP', serverIp);
                await AsyncStorage.setItem('userToken', res.data.token);
                await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
                navigation.replace('Main');
            }
        } catch (error) {
            console.error("Login Error:", error.message);
            let msg = 'Koneksi ke server gagal atau IP salah.';
            if (error.response && error.response.data && error.response.data.message) {
                msg = error.response.data.message;
            } else if (error.response && error.response.status === 401) {
                msg = 'Username atau kata sandi salah.';
            } else if (error.response && error.response.status === 500) {
                msg = 'Terjadi kesalahan di server (Database/Backend).';
            }
            Alert.alert('Login Gagal', msg);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f3f4f6' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="lan" size={60} color="#2563eb" />
                    </View>
                    <Text style={styles.title}>IoT Dashboard</Text>
                    <Text style={styles.subtitle}>Masukkan kredensial Anda untuk masuk ke sistem.</Text>

                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="server-network" size={20} color="#6b7280" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="IP Server (cth: 192.168.1.5)"
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
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={20} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                        <Text style={styles.loginBtnText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.linkBtnText}>Belum punya akun? Daftar di sini.</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    loginBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10
    },
    loginBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    linkBtn: {
        alignItems: 'center',
        marginTop: 15
    },
    linkBtnText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: 'bold'
    }
});
