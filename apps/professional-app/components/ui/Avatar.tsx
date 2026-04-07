import React from "react";
import { View, Text, StyleSheet, Image, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColorScheme";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
	source?: { uri: string } | number;
	alt?: string;
	size?: AvatarSize;
	fallback?: string;
	style?: ViewStyle;
}

export function Avatar({
	source,
	alt = "Avatar",
	size = "md",
	fallback,
	style,
}: AvatarProps) {
	const colors = useColors();

	const getSize = () => {
		switch (size) {
			case "sm":
				return { width: 32, height: 32, fontSize: 12 };
			case "lg":
				return { width: 48, height: 48, fontSize: 18 };
			case "xl":
				return { width: 64, height: 64, fontSize: 24 };
			default:
				return { width: 40, height: 40, fontSize: 14 };
		}
	};

	const sizeStyles = getSize();
	const initials = fallback
		? fallback
				.split(" ")
				.map((n) => n.charAt(0).toUpperCase())
				.join("")
		: "";

	return (
		<View
			style={[
				styles.avatar,
				{
					width: sizeStyles.width,
					height: sizeStyles.height,
					borderRadius: sizeStyles.width / 2,
				},
				style,
			]}
			accessibilityLabel={alt}
		>
			{source ? (
				<Image
					source={source}
					style={[styles.image, { borderRadius: sizeStyles.width / 2 }]}
				/>
			) : (
				<View
					style={[styles.fallback, { backgroundColor: colors.primary + "20" }]}
				>
					<Text
						style={[
							styles.fallbackText,
							{ color: colors.primary, fontSize: sizeStyles.fontSize },
						]}
					>
						{initials}
					</Text>
				</View>
			)}
		</View>
	);
}

interface AvatarGroupProps {
	children: React.ReactNode;
	max?: number;
	style?: ViewStyle;
}

export function AvatarGroup({ children, max = 3, style }: AvatarGroupProps) {
	const colors = useColors();

	const childrenArray = React.Children.toArray(children).slice(0, max);

	return (
		<View style={[styles.group, style]}>
			{childrenArray.map((child: any, index: number) => (
				<View
					key={index}
					style={[
						styles.groupItem,
						{
							borderColor: colors.background,
							marginLeft: index > 0 ? -8 : 0,
						},
					]}
				>
					{child}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	avatar: {
		overflow: "hidden",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#f3f4f6",
	},
	image: {
		width: "100%",
		height: "100%",
	},
	fallback: {
		width: "100%",
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
	},
	fallbackText: {
		fontWeight: "600",
	},
	group: {
		flexDirection: "row",
		alignItems: "center",
	},
	groupItem: {
		borderWidth: 2,
	},
});
