import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { Input } from './Input';
import { Ionicons } from '@expo/vector-icons';

interface FormFieldProps {
    label?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    containerStyle?: ViewStyle;
    icon?: keyof typeof Ionicons.glyphMap;
    description?: string;
}

/**
 * A wrapper component for form fields that provides a standardized layout,
 * including label, required indicator, and error messages.
 * 
 * While the Input component handles its own labels/errors, FormField can be used
 * for custom inputs, pickers, or wrapping groups of inputs.
 */
export function FormField({
    label,
    error,
    required,
    children,
    containerStyle,
    icon,
    description,
}: FormFieldProps) {
    const colors = useColors();

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <View style={styles.labelContainer}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={16}
                            color={colors.textSecondary}
                            style={styles.labelIcon}
                        />
                    )}
                    <Text style={[styles.label, { color: colors.text }]}>
                        {label}
                        {required && <Text style={{ color: colors.error }}> *</Text>}
                    </Text>
                </View>
            )}

            {description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {description}
                </Text>
            )}

            <View style={styles.fieldContent}>
                {children}
            </View>

            {error && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        width: '100%',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelIcon: {
        marginRight: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
    },
    description: {
        fontSize: 12,
        marginBottom: 8,
        lineHeight: 16,
    },
    fieldContent: {
        width: '100%',
    },
    errorText: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
});
