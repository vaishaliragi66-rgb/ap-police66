import React from "react";
import "./SARCPLPrescriptionReport.css";

// Utility: format date/time
const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const calculateBMI = (heightCm, weightKg) => {
  const h = Number(heightCm) || 0;
  const w = Number(weightKg) || 0;
  if (!h || !w) return "—";
  const m = h / 100;
  return (w / (m * m)).toFixed(1);
};

/**
 * SARCPLPrescriptionReport
 * Props: reportData (JSON)
 * - hospital: { name, address, contact, email, logo }
 * - patient: { name, age, gender, absNo, mrn, bloodGroup }
 * - encounter: { doctor, department, date, visitType, prescriptionId }
 * - vitals: { bp, pulse, temperature, spo2, height, weight, sugar, grbs }
 * - investigations: { tests: [], xrays: [], notes }
 * - diagnosis: { primary, icd, notes }
 * - prescriptions: [ { name, dosage, frequency, duration, instructions } ]
 */
const SARCPLPrescriptionReport = ({ reportData = {} }) => {
  const hospital = reportData.hospital || {};
  const patient = reportData.patient || {};
  const encounter = reportData.encounter || {};
  const vitals = reportData.vitals || {};
  const investigations = reportData.investigations || {};
  const diagnosis = reportData.diagnosis || {};
  const prescriptions = Array.isArray(reportData.prescriptions) ? reportData.prescriptions : [];
  const qrUrl = reportData.qrUrl || null;

  const bmi = vitals.bmi || calculateBMI(vitals.height, vitals.weight);

  return (
    <div className="sarcpl-report-root">
      <div className="sarcpl-page">
        <header className="sarcpl-header">
          <div className="sarcpl-header-inner">
            <div className="sarcpl-brand">
              <div className="sarcpl-logo">
                {hospital.logo ? (
                  <img src={hospital.logo} alt={hospital.name || "SARCPL"} />
                ) : (
                  <div className="sarcpl-logo-text">SARCPL</div>
                )}
              </div>
              <div className="sarcpl-institute">
                <div className="sarcpl-institute-name">{hospital.name || "SARCPL"}</div>
                <div className="sarcpl-institute-contact">{hospital.address || ""}{hospital.contact ? ` • ${hospital.contact}` : ""}</div>
              </div>
            </div>

            <div className="sarcpl-report-meta">
              <div className="report-title">Doctor Prescription</div>
              <div className="report-meta-row">
                <div className="meta-item"><span className="meta-label">Date:</span> {formatDateTime(encounter.date)}</div>
                <div className="meta-item"><span className="meta-label">Presc. ID:</span> {encounter.prescriptionId || encounter.visitId || '—'}</div>
              </div>
            </div>
          </div>
        </header>

        <section className="patient-encounter">
          <div className="pe-left">
            <div className="pe-row"><div className="pe-label">Patient</div><div className="pe-value">{patient.name || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">Age / Gender</div><div className="pe-value">{patient.age || '—'} / {patient.gender || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">ABS No</div><div className="pe-value">{patient.absNo || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">Patient ID (MRN)</div><div className="pe-value">{patient.mrn || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">Blood Group</div><div className="pe-value">{patient.bloodGroup || '—'}</div></div>
          </div>

          <div className="pe-right">
            <div className="pe-row"><div className="pe-label">Doctor</div><div className="pe-value">{encounter.doctor || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">Department</div><div className="pe-value">{encounter.department || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">Date & Time</div><div className="pe-value">{formatDateTime(encounter.date)}</div></div>
            <div className="pe-row"><div className="pe-label">Visit Type</div><div className="pe-value">{encounter.visitType || '—'}</div></div>
            <div className="pe-row"><div className="pe-label">Prescription ID</div><div className="pe-value">{encounter.prescriptionId || '—'}</div></div>
          </div>
        </section>

        <main className="report-body">
          <aside className="left-column">
            <div className="card block-vitals">
              <div className="card-title">Vitals</div>
              <div className="card-content">
                <div className="kv"><span>BP</span><span>{vitals.bp || '—'}</span></div>
                <div className="kv"><span>Pulse</span><span>{vitals.pulse || '—'}</span></div>
                <div className="kv"><span>Temperature</span><span>{vitals.temperature !== undefined && vitals.temperature !== null ? `${vitals.temperature} °F` : '—'}</span></div>
                <div className="kv"><span>SpO₂</span><span>{vitals.spo2 || '—'}</span></div>
                <div className="kv"><span>Height</span><span>{vitals.height ? `${vitals.height} cm` : '—'}</span></div>
                <div className="kv"><span>Weight</span><span>{vitals.weight ? `${vitals.weight} kg` : '—'}</span></div>
                <div className="kv"><span>BMI</span><span>{bmi}</span></div>
              </div>
            </div>

            <div className="card block-investigations">
              <div className="card-title">Investigations</div>
              <div className="card-content">
                {investigations.tests && investigations.tests.length > 0 ? (
                  <div>
                    <div className="sub">Lab Tests</div>
                    <ul className="invest-list">{investigations.tests.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                ) : <div className="muted">No lab tests</div>}

                {investigations.xrays && investigations.xrays.length > 0 ? (
                  <div className="mt-2">
                    <div className="sub">X‑rays / Radiology</div>
                    <ul className="invest-list">{investigations.xrays.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                ) : null}

                {investigations.notes ? <div className="invest-note">{investigations.notes}</div> : null}
              </div>
            </div>
          </aside>

          <section className="right-column">
            <div className="card block-diagnosis">
              <div className="card-title">Diagnosis</div>
              <div className="card-content">
                <div className="diag-primary"><strong>{diagnosis.primary || '—'}</strong> {diagnosis.icd ? <span className="icd">ICD‑10: {diagnosis.icd}</span> : null}</div>
                {diagnosis.notes ? <div className="doctor-notes">{diagnosis.notes}</div> : null}
              </div>
            </div>

            <div className="card block-prescription">
              <div className="card-title">Prescription (Rx)</div>
              <div className="card-content">
                <table className="rx-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.length > 0 ? (
                      prescriptions.map((p, i) => (
                        <tr key={i}>
                          <td>{p.name || '—'}</td>
                          <td>{p.dosage || '—'}</td>
                          <td>{p.frequency || '—'}</td>
                          <td>{p.duration || '—'}</td>
                          <td>{p.instructions || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="muted">No medicines prescribed</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>

        <footer className="sarcpl-footer">
          <div className="footer-left">{hospital.contact || ''} {hospital.email ? ` • ${hospital.email}` : ''}</div>
          <div className="footer-center">This is a digitally generated report. For verification, contact reception.</div>
          <div className="footer-right">
            {qrUrl ? <img src={qrUrl} alt="QR" className="footer-qr" /> : <div className="qr-placeholder">QR</div>}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SARCPLPrescriptionReport;

/*
  Sample usage:

  import SARCPLPrescriptionReport from './SARCPLPrescriptionReport';

  const data = { hospital: { name: 'SARCPL Clinic', address: '123 Main St', contact: '+91 9xxxxxxxxx', email: 'info@sarcpl.org' }, patient: { name: 'John Doe', age: 34, gender: 'M', absNo: 'ABS123', mrn: 'MRN-001', bloodGroup: 'B+' }, encounter: { doctor: 'Dr. A', department: 'General', date: Date.now(), visitType: 'OPD', prescriptionId: 'P-123' }, vitals: { bp: '120/80', pulse: 78, temperature: 37, spo2: '98%', height: 175, weight: 72 }, investigations: { tests: ['CBC', 'LFT'], xrays: ['Chest X-ray'], notes: 'Fasting required for Lipid profile' }, diagnosis: { primary: 'Upper respiratory infection', icd: 'J06.9', notes: 'Viral' }, prescriptions: [ { name: 'Paracetamol', dosage: '500 mg', frequency: 'TDS', duration: '3 days', instructions: 'After food' } ] };

  <SARCPLPrescriptionReport reportData={data} />

*/
