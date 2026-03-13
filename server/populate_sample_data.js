const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function populateSampleData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ap-police');

    const Employee = require('./models/employee');
    const FamilyMember = require('./models/family_member');
    const Prescription = require('./models/Prescription');
    const DiagnosisRecord = require('./models/diagnostics_record');
    const Disease = require('./models/disease');
    const Institute = require('./models/master_institute');

    // Get existing institute
    const institute = await Institute.findOne({ Institute_Name: 'Sample Police Institute' });
    if (!institute) {
      throw new Error('Sample Police Institute not found');
    }

    console.log('Using existing institute:', institute.Institute_Name);

    // Create sample employees
    const john = await Employee.create({
      Name: 'John Doe',
      ABS_NO: 'ABS001',
      Email: 'john.doe@police.com',
      Password: await bcrypt.hash('password123', 10),
      Designation: 'Constable',
      Gender: 'Male',
      DOB: new Date('1985-05-15'),
      Phone_No: '9876543211',
      Photo: 'default.jpg',
      Address: {
        Street: '456 Employee St',
        District: 'Employee District',
        State: 'Employee State',
        Pincode: '123457'
      },
      Blood_Group: 'O+',
      Height: '175 cm',
      Weight: '70 kg'
    });

    const jane = await Employee.create({
      Name: 'Jane Smith',
      ABS_NO: 'ABS002',
      Email: 'jane.smith@police.com',
      Password: await bcrypt.hash('password123', 10),
      Designation: 'Inspector',
      Gender: 'Female',
      DOB: new Date('1990-08-20'),
      Phone_No: '9876543212',
      Photo: 'default.jpg',
      Address: {
        Street: '789 Employee Ave',
        District: 'Employee District',
        State: 'Employee State',
        Pincode: '123458'
      },
      Blood_Group: 'A+',
      Height: '165 cm',
      Weight: '60 kg'
    });

    console.log('Created employees:', john.Name, jane.Name);

    // Create family member for John
    const johnsWife = await FamilyMember.create({
      Name: 'Mary Doe',
      Relationship: 'Wife',
      Employee: john._id,
      Gender: 'Female',
      DOB: new Date('1987-03-10'),
      Phone_No: '9876543213',
      Blood_Group: 'B+',
      Height: '160 cm',
      Weight: '55 kg'
    });

    console.log('Created family member:', johnsWife.Name);

    // Create prescriptions for John
    const johnPrescription1 = await Prescription.create({
      Institute: institute._id,
      Employee: john._id,
      IsFamilyMember: false,
      Medicines: [
        {
          Medicine_Name: 'Paracetamol',
          Dosage: '1-0-1',
          Duration: '5 days',
          Quantity: 10
        },
        {
          Medicine_Name: 'Amoxicillin',
          Dosage: '0-0-1',
          Duration: '7 days',
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
          Medicine_Name: 'Ibuprofen',
          Dosage: '1-1-1',
          Duration: '3 days',
          Quantity: 9
        }
      ],
      Notes: 'For pain relief',
      Timestamp: new Date('2024-02-20T14:30:00Z')
    });

    console.log('Created prescriptions for John');

    // Create diagnosis records for John
    const johnDiagnosis1 = await DiagnosisRecord.create({
      Institute_ID: institute._id,
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
      Institute_ID: institute._id,
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

    // Create prescription for John's wife (family member)
    const wifePrescription = await Prescription.create({
      Institute: institute._id,
      FamilyMember: johnsWife._id,
      IsFamilyMember: true,
      Medicines: [
        {
          Medicine_Name: 'Vitamin D',
          Dosage: '0-0-1',
          Duration: '30 days',
          Quantity: 30
        }
      ],
      Notes: 'Daily supplement',
      Timestamp: new Date('2024-03-01T11:00:00Z')
    });

    console.log('Created prescription for family member');

    console.log('\n=== SAMPLE DATA CREATED SUCCESSFULLY ===');
    console.log('Institute ID:', institute._id);
    console.log('John\'s ID:', john._id);
    console.log('Jane\'s ID:', jane._id);
    console.log('\nYou can now test the analytics at:');
    console.log(`http://localhost:6100/institute-api/analytics/${institute._id}`);

  } catch (error) {
    console.error('Error populating sample data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

populateSampleData();