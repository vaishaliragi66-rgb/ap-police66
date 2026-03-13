const mongoose = require('mongoose');

async function addMedicalData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ap-police');

    const Employee = require('./models/employee');
    const FamilyMember = require('./models/family_member');
    const Prescription = require('./models/Prescription');
    const DiagnosisRecord = require('./models/diagnostics_record');
    const Disease = require('./models/disease');
    const Institute = require('./models/master_institute');

    const institute = await Institute.findOne({ Institute_Name: 'Sample Police Institute' });
    const john = await Employee.findOne({ ABS_NO: 'ABS001' });
    const jane = await Employee.findOne({ ABS_NO: 'ABS002' });

    const Medicine = require('./models/master_medicine');
    const paracetamol = await Medicine.findOne({ Medicine_Name: 'Paracetamol' });
    const amoxicillin = await Medicine.findOne({ Medicine_Name: 'Amoxicillin' });
    const ibuprofen = await Medicine.findOne({ Medicine_Name: 'Ibuprofen' });

    console.log('Found medicines:', paracetamol._id, amoxicillin._id, ibuprofen._id);

    // Create prescriptions for John
    const johnPrescription1 = await Prescription.create({
      Institute: institute._id,
      Employee: john._id,
      IsFamilyMember: false,
      Medicines: [
        {
          Medicine_ID: paracetamol._id,
          Medicine_Name: 'Paracetamol',
          Quantity: 10
        },
        {
          Medicine_ID: amoxicillin._id,
          Medicine_Name: 'Amoxicillin',
          Quantity: 7
        }
      ],
      Notes: 'Take after food',
      Timestamp: new Date('2024-01-15T10:00:00Z')
    });

    const johnPrescription2 = await Prescription.create({
      Institute: institute._id,
      Employee: john._id,
      IsFamilyMember: false,
      Medicines: [
        {
          Medicine_ID: ibuprofen._id,
          Medicine_Name: 'Ibuprofen',
          Quantity: 9
        }
      ],
      Notes: 'For pain relief',
      Timestamp: new Date('2024-02-20T14:30:00Z')
    });

    console.log('Created prescriptions for John');

    // Create diagnosis records for John
    const johnDiagnosis1 = await DiagnosisRecord.create({
      Institute: institute._id,
      Employee: john._id,
      IsFamilyMember: false,
      Tests: [
        {
          Test_Name: 'Blood Sugar',
          Result_Value: '95',
          Reference_Range: '70-140',
          Units: 'mg/dL',
          Remarks: 'Normal'
        },
        {
          Test_Name: 'Cholesterol',
          Result_Value: '180',
          Reference_Range: '0-200',
          Units: 'mg/dL',
          Remarks: 'Borderline'
        }
      ],
      Diagnosis_Notes: 'Routine health check',
      createdAt: new Date('2024-01-15T09:00:00Z')
    });

    const johnDiagnosis2 = await DiagnosisRecord.create({
      Institute: institute._id,
      Employee: john._id,
      IsFamilyMember: false,
      Tests: [
        {
          Test_Name: 'Hemoglobin',
          Result_Value: '14.2',
          Reference_Range: '13.5-17.5',
          Units: 'g/dL',
          Remarks: 'Normal'
        }
      ],
      Diagnosis_Notes: 'Follow-up check',
      createdAt: new Date('2024-02-20T13:00:00Z')
    });

    console.log('Created diagnosis records for John');

    // Create diseases for John
    const johnDisease1 = await Disease.create({
      Employee_ID: john._id,
      Institute_ID: institute._id,
      IsFamilyMember: false,
      Disease_Name: 'Hypertension',
      Category: 'Non-Communicable',
      Severity_Level: 'Mild',
      Diagnosis_Date: new Date('2024-01-10'),
      Status: 'Active'
    });

    const johnDisease2 = await Disease.create({
      Employee_ID: john._id,
      Institute_ID: institute._id,
      IsFamilyMember: false,
      Disease_Name: 'Common Cold',
      Category: 'Communicable',
      Severity_Level: 'Mild',
      Diagnosis_Date: new Date('2024-02-15'),
      Status: 'Resolved'
    });

    console.log('Created diseases for John');

    console.log('\n=== MEDICAL DATA ADDED SUCCESSFULLY ===');
    console.log('You can now test the analytics at:');
    console.log(`http://localhost:6100/institute-api/analytics/${institute._id}`);

  } catch (error) {
    console.error('Error adding medical data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addMedicalData();