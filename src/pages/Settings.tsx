import { Navigate, useSearchParams } from "react-router-dom";

const TAB_REDIRECT_MAP: Record<string, string> = {
	profile: "perfil",
	notifications: "notifications",
	security: "security",
	organization: "clinic",
	schedule: "agenda",
	a11y: "appearance",
};

export default function SettingsRedirect() {
	const [searchParams] = useSearchParams();
	const tab = searchParams.get("tab") || "profile";
	const mappedTab = TAB_REDIRECT_MAP[tab] || "perfil";
	return <Navigate to={`/profile?tab=${mappedTab}`} replace />;
}
