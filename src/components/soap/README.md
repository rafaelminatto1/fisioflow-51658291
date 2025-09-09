# SOAP Records System - FisioFlow

## Overview

The SOAP (Subjective, Objective, Assessment, Plan) Records System is a comprehensive healthcare documentation solution designed specifically for physiotherapy practices. This system provides professional-grade electronic medical records with full compliance to healthcare standards and Brazilian data protection regulations (LGPD).

## Features

### 📋 Core SOAP Functionality
- **Subjective**: Patient-reported symptoms, pain scales, functional limitations
- **Objective**: Physical examination, range of motion, functional assessments  
- **Assessment**: Clinical analysis, diagnosis, prognosis
- **Plan**: Treatment protocols, goals, discharge criteria

### 🏥 Healthcare Compliance
- **Digital Signatures**: Cryptographic signing with audit trails
- **LGPD Compliance**: Data protection and patient consent management
- **Audit Logging**: Complete activity tracking for regulatory compliance
- **Session Tracking**: Sequential numbering and progress monitoring

### 🎯 Clinical Assessment Tools
- **Pain Scale**: Visual 0-10 scale with body region mapping
- **Range of Motion**: Goniometric measurements with normal ranges
- **Functional Assessments**: Standardized scales (Oswestry, NDI, DASH, Berg, Barthel)
- **Photo Documentation**: Clinical imaging with privacy controls

### 🔒 Security & Privacy
- **Digital Signatures**: Tamper-proof document validation
- **Audit Trails**: Complete access and modification logging
- **Role-Based Access**: Professional credential validation
- **Data Encryption**: Secure storage and transmission

## System Architecture

```
src/components/soap/
├── SOAPWizard.tsx           # Main wizard interface
├── PainScale.tsx            # Pain assessment component
├── RangeOfMotion.tsx        # ROM measurement tools
├── FunctionalAssessment.tsx # Standardized assessment scales
├── PhotoDocumentation.tsx   # Clinical photography
├── DigitalSignature.tsx     # Electronic signature
├── AuditTrail.tsx          # Compliance logging
└── index.ts                # Component exports

src/hooks/
└── useSOAPRecords.tsx      # Data management hook
```

## Components Documentation

### SOAPWizard
Main interface for creating and editing SOAP records with step-by-step guidance.

**Props:**
```typescript
interface SOAPWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  appointmentId?: string;
  existingRecordId?: string;
  onSave?: () => void;
}
```

**Features:**
- Step-by-step wizard interface
- Template system for common conditions
- Progress tracking and validation
- Auto-save and draft management

### PainScale
Comprehensive pain assessment with visual scale and body mapping.

**Features:**
- Visual 0-10 pain scale with descriptors
- Body region selection (multiple)
- Pain quality descriptors
- Aggravating/relieving factors

### RangeOfMotion
Goniometric assessment tools for joint mobility evaluation.

**Features:**
- Joint-specific movement templates
- Active and passive ROM measurement
- Comparison with normal ranges
- End-feel assessment
- Limitation severity calculation

### FunctionalAssessment
Implementation of standardized functional assessment scales.

**Supported Scales:**
- **Oswestry Disability Index**: Lower back disability
- **Neck Disability Index (NDI)**: Cervical spine function
- **DASH**: Upper extremity function
- **Berg Balance Scale**: Balance assessment
- **Barthel Index**: Activities of daily living

### PhotoDocumentation
Clinical photography with privacy compliance.

**Features:**
- LGPD-compliant image handling
- Categorization and annotation
- Privacy consent tracking
- File size and format validation
- Anatomical region tagging

### DigitalSignature
Electronic signature system for document validation.

**Features:**
- Healthcare-compliant digital signatures
- Timestamp and user validation
- Tamper detection
- Legal declarations and consent
- Device and session tracking

### AuditTrail
Comprehensive logging for regulatory compliance.

**Features:**
- Complete action logging
- Compliance flag monitoring
- Risk level assessment
- Data change tracking
- Export capabilities

## Usage

### Basic Implementation

```typescript
import { SOAPWizard, useSOAPRecords } from '@/components/soap';

function MedicalRecordsPage() {
  const { records, addRecord, loading } = useSOAPRecords();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');

  return (
    <>
      <Button onClick={() => setWizardOpen(true)}>
        New SOAP Record
      </Button>
      
      <SOAPWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        patientId={selectedPatient}
        onSave={() => {
          // Refresh records
          setWizardOpen(false);
        }}
      />
    </>
  );
}
```

### Data Management

```typescript
const { 
  records,
  loading,
  error,
  addRecord,
  updateRecord,
  signRecord,
  getRecordsByPatient,
  exportToPDF 
} = useSOAPRecords();

// Create new SOAP record
const newRecord = await addRecord({
  patient_id: 'patient-id',
  subjective: 'Patient complaints...',
  objective: JSON.stringify(objectiveData),
  assessment: 'Clinical assessment...',
  plan: JSON.stringify(planData)
});

// Sign a record
await signRecord(recordId);
```

## Database Schema

The system uses Supabase with the following key table:

```sql
CREATE TABLE soap_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  session_number INTEGER,
  subjective TEXT,
  objective JSONB,
  assessment TEXT,
  plan JSONB,
  vital_signs JSONB,
  functional_tests JSONB,
  signature_hash TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Compliance Features

### LGPD (Brazilian Data Protection Law)
- **Consent Management**: Explicit patient consent for data collection
- **Data Minimization**: Only collect necessary clinical data
- **Right to Erasure**: Support for data deletion requests
- **Access Control**: Role-based data access restrictions
- **Audit Trails**: Complete logging for compliance verification

### Healthcare Standards
- **Digital Signatures**: Legal equivalence to handwritten signatures
- **Document Integrity**: Cryptographic validation of record authenticity
- **Professional Identification**: CREFITO and professional credential validation
- **Session Continuity**: Sequential numbering and progress tracking

## Templates

The system includes pre-defined templates for common scenarios:

### Initial Evaluation
- Comprehensive patient history
- Standardized examination protocol
- Goal setting and prognosis
- Treatment plan development

### Follow-up Session
- Progress assessment
- Treatment modifications
- Goal progression
- Patient education

### Discharge Planning
- Outcome measurement
- Home program establishment
- Maintenance recommendations
- Follow-up scheduling

## Security Considerations

### Data Protection
- All data encrypted in transit and at rest
- Role-based access control (RBAC)
- Session management with timeout
- IP address and device tracking

### Compliance Monitoring
- Automated compliance flag detection
- Risk level assessment for actions
- Audit trail export capabilities
- Violation alerting system

## Performance Optimization

### Data Loading
- Lazy loading of SOAP components
- Progressive form validation
- Auto-save functionality
- Offline capability planning

### User Experience
- Step-by-step wizard interface
- Real-time validation feedback
- Template system for efficiency
- Mobile-responsive design

## Future Enhancements

### Planned Features
- **Voice Recognition**: Voice-to-text input for clinical notes
- **AI Assistance**: Smart suggestions based on clinical patterns
- **Integration**: EMR system interoperability
- **Mobile App**: Dedicated mobile application
- **Telehealth**: Remote consultation documentation

### Technical Improvements
- **Performance**: Optimized data loading and caching
- **Offline Mode**: Local storage with sync capabilities
- **Analytics**: Clinical outcome tracking and reporting
- **API**: RESTful API for third-party integrations

## Support and Documentation

For technical support or questions about implementation:

1. **Code Documentation**: Comprehensive inline comments
2. **Type Safety**: Full TypeScript implementation
3. **Testing**: Unit and integration test coverage
4. **Examples**: Real-world usage examples

## License and Compliance

This system is designed for healthcare environments and includes:

- LGPD compliance features
- Healthcare data security standards
- Professional workflow optimization
- Regulatory audit capabilities

**Important**: Always ensure proper professional licensing and institutional approval before deploying in clinical environments.