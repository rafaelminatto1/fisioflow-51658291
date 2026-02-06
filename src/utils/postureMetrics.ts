import { UnifiedLandmark, calculateAngle } from '@/utils/geometry';

export interface PostureMetric {
    name: string;
    label: string;
    value: number;
    unit: string;
    status: 'normal' | 'warning' | 'abnormal';
    reference?: string;
    description?: string;
}

export interface PostureReport {
    metrics: PostureMetric[];
    alerts: string[];
}

// MediaPipe Landmark Indices mapped for clarity
const LM = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    MOUTH_LEFT: 9,
    MOUTH_RIGHT: 10,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_PINKY: 17,
    RIGHT_PINKY: 18,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_THUMB: 21,
    RIGHT_THUMB: 22,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32
};

export const calculatePostureMetrics = (landmarks: UnifiedLandmark[], view: 'front' | 'side' | 'back'): PostureReport => {
    const metrics: PostureMetric[] = [];
    const alerts: string[] = [];

    if (!landmarks || landmarks.length < 33) {
        return { metrics: [], alerts: ['Landmarks insuficientes para análise.'] };
    }

    // --- FRONT VIEW ANALYSES ---
    if (view === 'front') {
        // 1. Head Tilt (Horizontal alignment of eyes or ears)
        // Angle of line connecting ears relative to horizontal
        const leftEar = landmarks[LM.LEFT_EAR];
        const rightEar = landmarks[LM.RIGHT_EAR];

        // Atan2(dy, dx) -> horizontal means dy=0. 
        // We want deviation from 0.
        const dyHead = leftEar.y - rightEar.y;
        const dxHead = leftEar.x - rightEar.x;
        const headTiltRad = Math.atan2(dyHead, dxHead);
        let headTiltDeg = Math.abs(headTiltRad * (180 / Math.PI));
        // Normalize: perfect horizontal is usually 0 or 180 depending on order.
        // Left - Right: if same Y, angle is 0 (if left < right in X? Left is usually larger X in screen coords if mirrored? No, standard image: 0,0 top left)
        // Wait, standard visual: Right Ear (users left) is index 8. Left Ear (users right) is 7.
        // Actually MP is subject-centric. 
        // Let's just take absolute deviation from horizontal (slope 0).

        // Simple slope check
        // If headTilt is close to 0 or 180, it's level.
        if (headTiltDeg > 170) headTiltDeg = 180 - headTiltDeg;

        metrics.push({
            name: 'head_tilt',
            label: 'Inclinação da Cabeça',
            value: Number(headTiltDeg.toFixed(1)),
            unit: '°',
            status: headTiltDeg > 3 ? 'warning' : 'normal',
            description: 'Desvio horizontal da cabeça.'
        });

        // 2. Shoulder Alignment (Acromion height diff)
        const leftShoulder = landmarks[LM.LEFT_SHOULDER];
        const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
        // Relative to trunk length or something? For now raw Y diff is approximated by angle too.

        const dyShoulder = leftShoulder.y - rightShoulder.y;
        const dxShoulder = leftShoulder.x - rightShoulder.x;
        const shoulderAngle = Math.abs(Math.atan2(dyShoulder, dxShoulder) * (180 / Math.PI));
        let shoulderDev = shoulderAngle;
        if (shoulderDev > 170) shoulderDev = 180 - shoulderDev;

        metrics.push({
            name: 'shoulder_level',
            label: 'Nivelamento Ombros',
            value: Number(shoulderDev.toFixed(1)),
            unit: '°',
            status: shoulderDev > 2 ? 'warning' : 'normal',
            description: 'Assimetria na altura dos ombros.'
        });

        // 3. Knee Valgus/Varus (Q-Angle approximation)
        // Hard in 2D without depth, but we can check Knee X position relative to Hip-Ankle line.
        // Or simpler: Angle Hip-Knee-Ankle. 180 is straight.
        // Inner angle.

        // Left Leg
        // Note: Landmark util calculateAngle returns 0-180.
        // We need points for Left Hip, Left Knee, Left Ankle
        const leftKneeAngle = calculateAngle(
            { x: landmarks[LM.LEFT_HIP].x, y: landmarks[LM.LEFT_HIP].y, z: 0 },
            { x: landmarks[LM.LEFT_KNEE].x, y: landmarks[LM.LEFT_KNEE].y, z: 0 },
            { x: landmarks[LM.LEFT_ANKLE].x, y: landmarks[LM.LEFT_ANKLE].y, z: 0 }
        );

        // Normal is ~170-180? Valgus < 170 (knock kneed)? Varus > 180 (bow legged)? 
        // calculateAngle usually returns internal angle. Straight leg = 180.

        metrics.push({
            name: 'left_knee_align',
            label: 'Alinhamento Joelho E',
            value: Number(leftKneeAngle.toFixed(1)),
            unit: '°',
            status: leftKneeAngle < 170 ? 'warning' : 'normal',
            description: 'Ângulo Q estimado (valgo/varo).'
        });

        const rightKneeAngle = calculateAngle(
            { x: landmarks[LM.RIGHT_HIP].x, y: landmarks[LM.RIGHT_HIP].y, z: 0 },
            { x: landmarks[LM.RIGHT_KNEE].x, y: landmarks[LM.RIGHT_KNEE].y, z: 0 },
            { x: landmarks[LM.RIGHT_ANKLE].x, y: landmarks[LM.RIGHT_ANKLE].y, z: 0 }
        );

        metrics.push({
            name: 'right_knee_align',
            label: 'Alinhamento Joelho D',
            value: Number(rightKneeAngle.toFixed(1)),
            unit: '°',
            status: rightKneeAngle < 170 ? 'warning' : 'normal',
            description: 'Ângulo Q estimado (valgo/varo).'
        });
    }

    // --- SIDE VIEW ANALYSES ---
    if (view === 'side') {
        // 1. Forward Head Posture (Ear vs Shoulder X)
        // In side view, Ear X should align with Shoulder X
        // We assume User is facing Right or Left. 
        // We use just one side (Left or Right) depending on what's visible?
        // MP usually predicts both even if occluded, relying on Z. 
        // Best to use the side with higher visibility.

        const leftVis = landmarks[LM.LEFT_SHOULDER].visibility || 0;
        const rightVis = landmarks[LM.RIGHT_SHOULDER].visibility || 0;
        const side = leftVis > rightVis ? 'LEFT' : 'RIGHT';

        const ear = side === 'LEFT' ? landmarks[LM.LEFT_EAR] : landmarks[LM.RIGHT_EAR];
        const shoulder = side === 'LEFT' ? landmarks[LM.LEFT_SHOULDER] : landmarks[LM.RIGHT_SHOULDER];

        // CVA (Craniovertebral Angle) is better but needs C7. We don't have C7 in MP 33.
        // We approximate "Tragus-to-Acromion" horizontal offset.
        // Normalized by bounding box or simply angle of lines vert.

        // Calculate angle of Ear-Shoulder vector relative to Vertical (90 deg).
        const dx = ear.x - shoulder.x;
        const dy = ear.y - shoulder.y; // Y increases downwards
        // Angle from vertical
        const angleRad = Math.atan2(dx, -dy); // -dy because Y is down. Up is negative Y.
        // If perfectly vertical, dx=0, atan2(0, positive) = 0.

        const fhpDeg = angleRad * (180 / Math.PI);

        metrics.push({
            name: 'forward_head',
            label: 'Anteriorização Cabeça',
            value: Number(fhpDeg.toFixed(1)),
            unit: '°',
            status: Math.abs(fhpDeg) > 10 ? 'warning' : 'normal',
            description: 'Desvio anterior da cabeça em relação ao ombro.'
        });
    }

    return { metrics, alerts };
};
