/**
 * Local SEO Tracker Page
 *
 * Monitor Google Business Profile rankings and local SEO metrics
 */

import React from "react";
import {
	PageLayout,
	PageContainer,
	PageHeader,
} from "@/components/layout/PageLayout";
import { LocalSEOTracker } from "@/components/marketing/LocalSEOTracker";

export default function LocalSEOPage() {
	return (
		<PageLayout>
			<PageContainer>
				<LocalSEOTracker />
			</PageContainer>
		</PageLayout>
	);
}
