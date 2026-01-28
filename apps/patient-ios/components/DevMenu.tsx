import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export function DevMenu({ children }: { children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const router = useRouter();

    if (!__DEV__) {
        return <>{children}</>;
    }

    return (
        <View style={{ flex: 1 }}>
            {children}

            {/* Invisible trigger area (top-right corner) */}
            <TouchableOpacity
                style={styles.trigger}
                onLongPress={() => setVisible(true)}
                delayLongPress(1000)
      />

            <Modal visible={visible} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.menu}>
                        <Text style={styles.title}>👨‍💻 Dev Menu</Text>

                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => {
                                setVisible(false);
                                router.replace('/(auth)/login');
                            }}
                        >
                            <Text>Reset to Login</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => {
                                Alert.alert('Env Info', `API: ${process.env.EXPO_PUBLIC_API_URL}\nEnv: ${process.env.NODE_ENV}`);
                            }}
                        >
                            <Text>Show Env Info</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.item, styles.close]}
                            onPress={() => setVisible(false)}
                        >
                            <Text style={{ color: 'white' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    trigger: {
        position: 'absolute',
        top: 40,
        right: 0,
        width: 60,
        height: 60,
        zIndex: 9999,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    menu: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    item: {
        padding: 15,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    close: {
        backgroundColor: '#ef4444',
        marginTop: 10,
    }
});
