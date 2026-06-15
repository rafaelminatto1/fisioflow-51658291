/**
 * Local SEO Tracker Page
 *
 * Monitor Google Business Profile rankings and local SEO metrics
 */

import React from "react";
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
