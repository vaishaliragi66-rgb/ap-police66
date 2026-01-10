import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home_main_page from "./components/Home_main_page";
import InstituteRegister from "./components/institutes/institute_registration";
import InstituteLogin from "./components/institutes/institute_login";
import Institute_home from "./components/institutes/institute_home";
import EmployeeRegistration from "./components/employee/EmployeeRegistration";
import FamilyMemberRegistration from "./components/employee/FamilyRegistration";
import InstituteProfile from "./components/institutes/institute_profile";
import EmployeeLogin from "./components/employee/EmployeeLogin";
import EmployeeHome from "./components/employee/EmployeeHome";
import InstituteInventory from "./components/institutes/institute_inventory";
import PharmacyPrescriptionForm from "./components/institutes/PharmacyPrescriptionForm";
import DiagnosisEntryForm from "./components/institutes/DiagnosisEntryForm";
import PrescriptionReport from "./components/employee/PrescriptionReport";
import DiagnosisReport from './components/employee/DiagnosisReport'
import Diseases from "./components/institutes/Diseases";
import InstituteReports from "./components/institutes/institutions_reports";
import InstituteLedger from "./components/institutes/InstituteLedger";
import MedicinesIssuedRegister from "./components/institutes/MedicinesIssuedRegister";
import EmployeeDiseaseReport from "./components/employee/EmployeeDiseaseReport";
import EmployeeProfile from "./components/employee/EmployeeProfile";
import FamilyMemberProfile from "./components/employee/FamilyMemberProfile";
import InstituteIndent from "./components/institutes/InstituteIndent";
import DoctorPrescriptionForm from "./components/institutes/DoctorPrescriptionForm";
import VisitRegister from "./components/institutes/VisitRegister";
import DoctorDiagnosisForm from "./components/institutes/DoctorDiagnosisForm";
import MainStore from "./components/institutes/main_store"
import SubStore from "./components/institutes/sub_store"
import AddMainStoreMedicine from "./components/institutes/AddMainStoreMedicine";
import TransferMainStoreMedicine from "./components/institutes/TransferMainstoreMedicine";
import InstituteAnalytics from "./components/institutes/institute_analytics";
import axios from "axios";

const token = localStorage.getItem("instituteToken");

if (token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home_main_page />,
    },
    {
      path:"/institutes/register",
      element:<InstituteRegister/>
    },{
      path:"/institutes/login",
      element:<InstituteLogin/>
    },{
      path:"/institutes/home",
      element:<Institute_home/>
    },{
      path:"/institutes/profile",
      element:<InstituteProfile/>
    },
    {
      path:"/institutes/inventory",
      element:<InstituteInventory/>
    },
    {
      path:"/institutes/ledger",
      element:<InstituteLedger/>
    },
    {
      path:"/institutes/indent",
      element:<InstituteIndent/>
    },
    {
      path:"/institutes/medicines-issued-register",
      element:<MedicinesIssuedRegister/>
    },
    {
      path:"institutions/diagnosis-entry",
      element:<DiagnosisEntryForm/>
    },
    {
      path:"institutions/prescriptions",
      element:<PharmacyPrescriptionForm/>
    },{
      path:"institutions/diseases",
      element:<Diseases/>
    },{
      path:"institutions/reports",
      element:<InstituteReports/>
    },
    {
      path:"/institutes/doctor-prescription",
      element:<DoctorPrescriptionForm/>
    },
    {
      path:"/institutes/doctor-diagnosis",
      element:<DoctorDiagnosisForm/>
    },
    {path:"/institutes/visit-register",
      element:<VisitRegister/>
    },
    {
      path:"/employee-register",
      element:<EmployeeRegistration/>,
    },
    {
      path:"/employee-login",
      element:<EmployeeLogin/>,
      
    },
    {
      path: "employee/family_register",
      element: <FamilyMemberRegistration />,
    },
    {
      path: "employee/prescription-report",
      element: <PrescriptionReport />,
    },
    {
      path: "employee/diagnosis-report",
      element: <DiagnosisReport />,
    },
    {
      path:"employee/home",
      element:<EmployeeHome/>
    },
    {
      path:"employee/disease-history",
      element:<EmployeeDiseaseReport/>
    },
    {
      path:"/employee/profile",
      element:<EmployeeProfile/>
    },
    {
      path:"/employee/family/:id",
      element:<FamilyMemberProfile/>
    },{
      path:"institutions/main-store",
      element:<MainStore/>
    },{
      path:"institutes/sub-store",
      element:<SubStore/>
    },{
      path:"/institutes/add",
      element:<AddMainStoreMedicine/>
    },{
      path:"institutes/transfer",
      element:<TransferMainStoreMedicine/>
    },{
      path:"/institutes/analytics",
      element:<InstituteAnalytics/>
    }
  ]);

    return (
      <div>
        <RouterProvider router={router} />
      </div>
    );
  }

export default App;