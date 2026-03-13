/**
 * FisioFlow - Rotas de Gamificação
 * @module routes/gamification
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Lazy loads - Gamification
const PatientGamificationPage = lazy(() => import(/* webpackChunkName: "gamification-patient" */ "@/pages/PatientGamificationPage"));
const AdminGamificationPage = lazy(() => import(/* webpackChunkName: "gamification-admin" */ "@/pages/admin/gamification/AdminGamificationPage"));
const GamificationAchievementsPage = lazy(() => import(/* webpackChunkName: "gamification-achievements" */ "@/pages/gamification/GamificationAchievementsPage"));
const GamificationQuestsPage = lazy(() => import(/* webpackChunkName: "gamification-quests" */ "@/pages/gamification/GamificationQuestsPage"));
const GamificationShopPage = lazy(() => import(/* webpackChunkName: "gamification-shop" */ "@/pages/gamification/GamificationShopPage"));
const GamificationLeaderboardPage = lazy(() => import(/* webpackChunkName: "gamification-leaderboard" */ "@/pages/gamification/GamificationLeaderboardPage"));

export const gamificationRoutes = (
  <>
    {/* Patient Gamification */}
    <Route path="/gamification" element={<ProtectedRoute><PatientGamificationPage /></ProtectedRoute>} />
    <Route path="/gamification/achievements" element={<ProtectedRoute><GamificationAchievementsPage /></ProtectedRoute>} />
    <Route path="/gamification/quests" element={<ProtectedRoute><GamificationQuestsPage /></ProtectedRoute>} />
    <Route path="/gamification/shop" element={<ProtectedRoute><GamificationShopPage /></ProtectedRoute>} />
    <Route path="/gamification/leaderboard" element={<ProtectedRoute><GamificationLeaderboardPage /></ProtectedRoute>} />
    
    {/* Admin Gamification */}
    <Route path="/admin/gamification" element={<ProtectedRoute allowedRoles={['admin', 'fisioterapeuta']}><AdminGamificationPage /></ProtectedRoute>} />
  </>
);