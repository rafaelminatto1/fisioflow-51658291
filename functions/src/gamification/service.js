"use strict";
/**
 * Gamification Service
 *
 * Logic for XP, Levels, and Streaks
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
var admin = require("firebase-admin");
var db = admin.firestore();
var GamificationService = /** @class */ (function () {
    function GamificationService() {
    }
    /**
     * Calculates XP required for a given level
     * Formula: level * 1000
     */
    GamificationService.getXpForLevel = function (level) {
        return level * 1000;
    };
    /**
     * Gets or creates a gamification profile for a patient
     */
    GamificationService.getProfile = function (patientId) {
        return __awaiter(this, void 0, void 0, function () {
            var doc, newProfile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.collection('gamification_profiles').doc(patientId).get()];
                    case 1:
                        doc = _a.sent();
                        if (doc.exists) {
                            return [2 /*return*/, doc.data()];
                        }
                        newProfile = {
                            patient_id: patientId,
                            current_xp: 0,
                            level: 1,
                            current_streak: 0,
                            longest_streak: 0,
                            total_points: 0,
                            last_activity_date: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        return [4 /*yield*/, db.collection('gamification_profiles').doc(patientId).set(newProfile)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, newProfile];
                }
            });
        });
    };
    /**
     * Awards XP to a patient and handles leveling up
     */
    GamificationService.awardXp = function (patientId, amount, reason, description) {
        return __awaiter(this, void 0, void 0, function () {
            var profile, transaction, newXp, newLevel, leveledUp, xpNeeded, today, lastActivity, newStreak, streakExtended, yesterday, yesterdayStr, updatedProfile, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getProfile(patientId)];
                    case 1:
                        profile = _a.sent();
                        transaction = {
                            id: db.collection('xp_transactions').doc().id,
                            patient_id: patientId,
                            amount: amount,
                            reason: reason,
                            description: description,
                            created_at: new Date().toISOString(),
                        };
                        newXp = profile.current_xp + amount;
                        newLevel = profile.level;
                        leveledUp = false;
                        xpNeeded = this.getXpForLevel(newLevel);
                        while (newXp >= xpNeeded) {
                            newXp -= xpNeeded;
                            newLevel++;
                            leveledUp = true;
                            xpNeeded = this.getXpForLevel(newLevel);
                        }
                        today = new Date().toISOString().split('T')[0];
                        lastActivity = profile.last_activity_date ? profile.last_activity_date.split('T')[0] : null;
                        newStreak = profile.current_streak;
                        streakExtended = false;
                        if (lastActivity !== today) {
                            yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            yesterdayStr = yesterday.toISOString().split('T')[0];
                            if (lastActivity === yesterdayStr) {
                                newStreak += 1;
                                streakExtended = true;
                            }
                            else {
                                newStreak = 1; // Reset streak if missed a day
                            }
                        }
                        updatedProfile = {
                            current_xp: newXp,
                            level: newLevel,
                            current_streak: newStreak,
                            longest_streak: Math.max(newStreak, profile.longest_streak),
                            total_points: profile.total_points + amount,
                            last_activity_date: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        batch = db.batch();
                        batch.set(db.collection('gamification_profiles').doc(patientId), updatedProfile, { merge: true });
                        batch.set(db.collection('xp_transactions').doc(transaction.id), transaction);
                        return [4 /*yield*/, batch.commit()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {
                                profile: __assign(__assign({}, profile), updatedProfile),
                                leveledUp: leveledUp,
                                newLevel: newLevel,
                                streakExtended: streakExtended
                            }];
                }
            });
        });
    };
    /**
     * Checks and awards achievements
     */
    GamificationService.checkAchievements = function (patientId) {
        return __awaiter(this, void 0, void 0, function () {
            var profile, achievementsToAward, transactions, _i, achievementsToAward_1, code, alreadyHas, achievementRef;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getProfile(patientId)];
                    case 1:
                        profile = _a.sent();
                        achievementsToAward = [];
                        return [4 /*yield*/, db.collection('xp_transactions')
                                .where('patient_id', '==', patientId)
                                .limit(1)
                                .get()];
                    case 2:
                        transactions = _a.sent();
                        if (!transactions.empty) {
                            achievementsToAward.push('first_steps');
                        }
                        // 2. Check "Week Warrior" (7 day streak)
                        if (profile.current_streak >= 7) {
                            achievementsToAward.push('week_warrior');
                        }
                        // 3. Check "Level 10"
                        if (profile.level >= 10) {
                            achievementsToAward.push('top_performer');
                        }
                        _i = 0, achievementsToAward_1 = achievementsToAward;
                        _a.label = 3;
                    case 3:
                        if (!(_i < achievementsToAward_1.length)) return [3 /*break*/, 8];
                        code = achievementsToAward_1[_i];
                        return [4 /*yield*/, db.collection('achievements_log')
                                .where('patient_id', '==', patientId)
                                .where('achievement_code', '==', code)
                                .get()];
                    case 4:
                        alreadyHas = _a.sent();
                        if (!alreadyHas.empty) return [3 /*break*/, 7];
                        achievementRef = db.collection('achievements_log').doc();
                        return [4 /*yield*/, achievementRef.set({
                                id: achievementRef.id,
                                patient_id: patientId,
                                achievement_code: code,
                                unlocked_at: new Date().toISOString(),
                            })];
                    case 5:
                        _a.sent();
                        // Award bonus XP for achievement
                        return [4 /*yield*/, this.awardXp(patientId, 200, 'achievement_unlocked', "Conquista desbloqueada: ".concat(code))];
                    case 6:
                        // Award bonus XP for achievement
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return GamificationService;
}());
exports.GamificationService = GamificationService;
