/**
 * FisioFlow - Rotas de Marketing
 * @module routes/marketing
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Lazy loads - Marketing
const ReviewsPage = lazy(() => import(/* webpackChunkName: "marketing-reviews" */ "@/pages/marketing/Reviews"));
const MarketingDashboard = lazy(() => import(/* webpackChunkName: "marketing-dashboard" */ "@/pages/marketing/Dashboard"));
const MarketingContentGenerator = lazy(() => import(/* webpackChunkName: "marketing-content" */ "@/pages/marketing/ContentGenerator"));
const MarketingContentCalendar = lazy(() => import(/* webpackChunkName: "marketing-calendar" */ "@/pages/marketing/ContentCalendar"));
const MarketingMythVsTruth = lazy(() => import(/* webpackChunkName: "marketing-myth" */ "@/pages/marketing/MythVsTruth"));
const MarketingWhatsAppScripts = lazy(() => import(/* webpackChunkName: "marketing-whatsapp" */ "@/pages/marketing/WhatsAppScripts"));
const MarketingJourneyTimelapse = lazy(() => import(/* webpackChunkName: "marketing-timelapse" */ "@/pages/marketing/JourneyTimelapse"));
const MarketingLocalSEO = lazy(() => import(/* webpackChunkName: "marketing-seo" */ "@/pages/marketing/LocalSEO"));
const MarketingGamification = lazy(() => import(/* webpackChunkName: "marketing-gamification" */ "@/pages/marketing/Gamification"));
const MarketingExports = lazy(() => import(/* webpackChunkName: "marketing-exports" */ "@/pages/marketing/Exports"));
const MarketingSettings = lazy(() => import(/* webpackChunkName: "marketing-settings" */ "@/pages/marketing/Settings"));
const FisioLinkPage = lazy(() => import(/* webpackChunkName: "marketing-fisiolink" */ "@/pages/marketing/FisioLink"));
const MarketingReferral = lazy(() => import(/* webpackChunkName: "marketing-referral" */ "@/pages/marketing/Referral"));
const MarketingROI = lazy(() => import(/* webpackChunkName: "marketing-roi" */ "@/pages/marketing/ROI"));
const BeforeAfterPage = lazy(() => import(/* webpackChunkName: "marketing-beforeafter" */ "@/pages/marketing/BeforeAfter"));

export const marketingRoutes = (
  <>
    <Route path="/marketing" element={<ProtectedRoute><MarketingDashboard /></ProtectedRoute>} />
    <Route path="/marketing/dashboard" element={<ProtectedRoute><MarketingDashboard /></ProtectedRoute>} />
    <Route path="/marketing/reviews" element={<ProtectedRoute><ReviewsPage /></ProtectedRoute>} />
    <Route path="/marketing/content-generator" element={<ProtectedRoute><MarketingContentGenerator /></ProtectedRoute>} />
    <Route path="/marketing/calendar" element={<ProtectedRoute><MarketingContentCalendar /></ProtectedRoute>} />
    <Route path="/marketing/myth-truth" element={<ProtectedRoute><MarketingMythVsTruth /></ProtectedRoute>} />
    <Route path="/marketing/whatsapp" element={<ProtectedRoute><MarketingWhatsAppScripts /></ProtectedRoute>} />
    <Route path="/marketing/timelapse" element={<ProtectedRoute><MarketingJourneyTimelapse /></ProtectedRoute>} />
    <Route path="/marketing/seo" element={<ProtectedRoute><MarketingLocalSEO /></ProtectedRoute>} />
    <Route path="/marketing/gamification" element={<ProtectedRoute><MarketingGamification /></ProtectedRoute>} />
    <Route path="/marketing/exports" element={<ProtectedRoute><MarketingExports /></ProtectedRoute>} />
    <Route path="/marketing/settings" element={<ProtectedRoute><MarketingSettings /></ProtectedRoute>} />
    <Route path="/marketing/fisiolink" element={<ProtectedRoute><FisioLinkPage /></ProtectedRoute>} />
    <Route path="/marketing/referral" element={<ProtectedRoute><MarketingReferral /></ProtectedRoute>} />
    <Route path="/marketing/roi" element={<ProtectedRoute><MarketingROI /></ProtectedRoute>} />
    <Route path="/marketing/before-after" element={<ProtectedRoute><BeforeAfterPage /></ProtectedRoute>} />
  </>
);