/**
 * WhatsApp Scripts Generator Page
 *
 * Full page for creating WhatsApp message templates
 */

import React from "react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { WhatsAppScriptGenerator } from "@/components/marketing/WhatsAppScriptGenerator";

export default function WhatsAppScriptsPage() {
	return (
		<PageLayout>
			<PageContainer>
				<WhatsAppScriptGenerator />
			</PageContainer>
		</PageLayout>
	);
}
