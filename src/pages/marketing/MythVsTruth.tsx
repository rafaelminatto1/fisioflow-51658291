/**
 * Myth vs Truth Generator Page
 *
 * Full page for creating "Mito vs Verdade" content for social media
 */

import React from "react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { MythVsTruthGenerator } from "@/components/marketing/MythVsTruthGenerator";

export default function MythVsTruthPage() {
	return (
		<PageLayout>
			<PageContainer>
				<MythVsTruthGenerator />
			</PageContainer>
		</PageLayout>
	);
}
