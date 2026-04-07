import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";

interface ProfileSectionProps {
	title: string;
	children: React.ReactNode;
	style?: any;
}

export function ProfileSection({
	title,
	children,
	style,
}: ProfileSectionProps) {
	const colors = useColors();

	return (
		<View style={[styles.container, style]}>
			<Text style={[styles.title, { color: colors.textSecondary }]}>
				{title}
			</Text>
			<View style={[styles.content, { backgroundColor: colors.surface }]}>
				{children}
			</View>
		</View>
	);
}

interface ProfileMenuItemProps {
	icon: keyof typeof Ionicons.prototype.props.name;
	label: string;
	value?: string;
	chevron?: boolean;
	onPress: () => void;
	style?: any;
	danger?: boolean;
}

export function ProfileMenuItem({
	icon,
	label,
	value,
	chevron = true,
	onPress,
	style,
	danger = false,
}: ProfileMenuItemProps) {
	const colors = useColors();

	return (
		<View
			style={[
				styles.menuItem,
				{
					borderBottomColor: colors.border,
				},
				style,
			]}
		>
			<View style={styles.menuItemLeft}>
				<View
					style={[
						styles.iconContainer,
						{
							backgroundColor: danger
								? colors.error + "15"
								: colors.primary + "15",
						},
					]}
				>
					<Ionicons
						name={icon as any}
						size={20}
						color={danger ? colors.error : colors.primary}
					/>
				</View>
				<View style={styles.textContainer}>
					<Text
						style={[
							styles.label,
							{ color: danger ? colors.error : colors.text },
						]}
					>
						{label}
					</Text>
					{value && (
						<Text style={[styles.value, { color: colors.textMuted }]}>
							{value}
						</Text>
					)}
				</View>
			</View>
			{chevron && (
				<Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
			)}
		</View>
	);
}

interface SettingsItemProps {
	label: string;
	value?: boolean;
	onToggle?: (value: boolean) => void;
	onPress?: () => void;
	style?: any;
	type?: "toggle" | "navigation";
}

export function SettingsItem({
	label,
	value,
	onToggle,
	onPress,
	style,
	type = "toggle",
}: SettingsItemProps) {
	const colors = useColors();
	const [isEnabled, setIsEnabled] = React.useState(value || false);

	const handleToggle = () => {
		const newValue = !isEnabled;
		setIsEnabled(newValue);
		onToggle?.(newValue);
	};

	return (
		<View
			style={[
				styles.settingsItem,
				{
					borderBottomColor: colors.border,
				},
				style,
			]}
		>
			<Text style={[styles.settingsLabel, { color: colors.text }]}>
				{label}
			</Text>
			{type === "toggle" ? (
				<TouchableOpacity
					onPress={handleToggle}
					style={[
						styles.toggle,
						{
							backgroundColor: isEnabled ? colors.primary : colors.border,
						},
					]}
					activeOpacity={0.7}
				>
					<View
						style={[
							styles.toggleKnob,
							{
								transform: [{ translateX: isEnabled ? 20 : 0 }],
							},
						]}
					/>
				</TouchableOpacity>
			) : (
				<Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 24,
	},
	title: {
		fontSize: 13,
		fontWeight: "600",
		marginBottom: 8,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	content: {
		borderRadius: 12,
		borderWidth: 1,
		overflow: "hidden",
	},
	menuItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
	},
	menuItemLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		gap: 12,
	},
	iconContainer: {
		width: 36,
		height: 36,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	textContainer: {
		flex: 1,
	},
	label: {
		fontSize: 15,
		fontWeight: "500",
		marginBottom: 2,
	},
	value: {
		fontSize: 13,
	},
	settingsItem: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
	},
	settingsLabel: {
		fontSize: 15,
		fontWeight: "500",
	},
	toggle: {
		width: 48,
		height: 28,
		borderRadius: 14,
		padding: 2,
		justifyContent: "flex-start",
	},
	toggleKnob: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#fff",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 2,
	},
});
