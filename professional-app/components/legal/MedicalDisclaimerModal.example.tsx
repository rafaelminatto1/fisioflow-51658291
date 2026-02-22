/**
 * Example usage of MedicalDisclaimerModal component
 * This file demonstrates how to integrate the modal in different contexts
 */

import React, { useState } from 'react';
import { View, Button } from 'react-native';
import MedicalDisclaimerModal from './MedicalDisclaimerModal';

/**
 * Example 1: First Launch Context
 * Show disclaimer during onboarding flow
 */
export function FirstLaunchExample() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const handleAcknowledge = () => {
    console.log('User acknowledged first-launch disclaimer');
    setShowDisclaimer(false);
    // Proceed to next onboarding step
  };

  return (
    <View>
      <MedicalDisclaimerModal
        visible={showDisclaimer}
        context="first-launch"
        onAcknowledge={handleAcknowledge}
      />
    </View>
  );
}

/**
 * Example 2: Exercise Prescription Context
 * Show disclaimer when prescribing exercises
 */
export function ExercisePrescriptionExample() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handlePrescribeExercise = () => {
    // Show disclaimer before allowing prescription
    setShowDisclaimer(true);
  };

  const handleAcknowledge = () => {
    console.log('User acknowledged exercise prescription disclaimer');
    setShowDisclaimer(false);
    // Proceed with exercise prescription
  };

  return (
    <View>
      <Button title="Prescrever Exercício" onPress={handlePrescribeExercise} />
      <MedicalDisclaimerModal
        visible={showDisclaimer}
        context="exercise-prescription"
        onAcknowledge={handleAcknowledge}
      />
    </View>
  );
}

/**
 * Example 3: Protocol Application Context
 * Show disclaimer when applying treatment protocol
 */
export function ProtocolApplicationExample() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleApplyProtocol = () => {
    // Show disclaimer before applying protocol
    setShowDisclaimer(true);
  };

  const handleAcknowledge = () => {
    console.log('User acknowledged protocol application disclaimer');
    setShowDisclaimer(false);
    // Proceed with protocol application
  };

  return (
    <View>
      <Button title="Aplicar Protocolo" onPress={handleApplyProtocol} />
      <MedicalDisclaimerModal
        visible={showDisclaimer}
        context="protocol-application"
        onAcknowledge={handleAcknowledge}
      />
    </View>
  );
}

/**
 * Example 4: Conditional Display Based on Previous Acknowledgment
 * Check if user has already acknowledged in this session
 */
export function ConditionalDisplayExample() {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handlePrescribeExercise = () => {
    if (!hasAcknowledged) {
      // First time in this session - show disclaimer
      setShowDisclaimer(true);
    } else {
      // Already acknowledged - proceed directly
      proceedWithPrescription();
    }
  };

  const handleAcknowledge = () => {
    console.log('User acknowledged disclaimer');
    setHasAcknowledged(true);
    setShowDisclaimer(false);
    proceedWithPrescription();
  };

  const proceedWithPrescription = () => {
    console.log('Proceeding with exercise prescription');
    // Your prescription logic here
  };

  return (
    <View>
      <Button title="Prescrever Exercício" onPress={handlePrescribeExercise} />
      <MedicalDisclaimerModal
        visible={showDisclaimer}
        context="exercise-prescription"
        onAcknowledge={handleAcknowledge}
      />
    </View>
  );
}
