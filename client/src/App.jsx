import React from "react";
import { createBrowserRouter, Outlet, RouterProvider, useLocation, useNavigate } from "react-router-dom";
import Home_main_page from "./components/Home_main_page";
import GlobalHeader from "./components/GlobalHeader";
import InstituteRegister from "./components/institutes/institute_registration";
import InstituteLogin from "./components/institutes/institute_login";
import Institute_home from "./components/institutes/institute_home";
import EmployeeRegistration from "./components/employee/EmployeeRegistration";
import FamilyMemberRegistration from "./components/employee/FamilyRegistration";
import InstituteProfile from "./components/institutes/institute_profile";
import EmployeeLogin from "./components/employee/Employeelogin";
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
import MainStore from "./components/institutes/main_store"
import AddMainStoreMedicine from "./components/institutes/AddMainStoreMedicine";
import TransferMainStoreMedicine from "./components/institutes/TransferMainStoreMedicine";
import InstituteAnalytics from "./components/institutes/institute_analytics";
import AdminRegister from "./components/admin/admin_register";
import AdminLogin from "./components/admin/admin_login";
import AdminDashboard from "./components/admin/admin_home";
import AIInsights from "./components/institutes/AIInsights";
import AdminInstituteReports from "./components/admin/institute_reports";
import AIInsights2 from "./components/admin/ai_insights";
import BulkEmployeeUpload from "./components/admin/BulkEmployeeUpload";
import DoctorDiagnosis from "./components/institutes/DoctorDiagnosisForm"
import axios from "axios";
import EmployeeReports from "./components/admin/employee_reports";
import DoctorLayout from "./components/institutes/DoctorLayout";
import OthersLayout from "./components/institutes/OthersLayout";
import XrayEntryForm from "./components/institutes/XrayEntryForm";
import XrayReport from "./components/employee/XrayReport";
import HealthSummary from "./components/institutes/HealthSummary";
import AddPasswords from "./components/institutes/AddPasswords";
import ForgotPassword from "./components/auth/ForgotPassword";
import DiseaseAnalyticsHome from "./components/institutes/DiseaseAnalyticsHome";
import DiseaseAnalyticsTable from "./components/institutes/DiseaseAnalyticsTable";
import DiseaseAnalyticsDetails from "./components/institutes/DiseaseAnalyticsDetails";
import RiskHotspots from "./components/institutes/RiskHotspots";
import Predict from "./components/institutes/Predict";
import ForecastDashboard from "./components/institutes/ForecastTable";
const token = localStorage.getItem("instituteToken");

if (token) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  const hasLocalBackButton =
    path === "/" ||
    path === "/institutes/home" ||
    path === "/employee/home" ||
    path === "/admin/dashboard" ||
    path === "/employee/profile" ||
    path === "/institutes/doctor-prescription" ||
    path === "/institutions/diagnosis-entry" ||
    path === "/employee/disease-history" ||
    path === "/employee/prescription-report" ||
    path === "/employee/diagnosis-report" ||    path === "/employee/xray-report" ||    path === "/institutes/health-summary" ||
    path.startsWith("/employee/family/") ||
    path === "/institutions/prescriptions" ||
    path === "/institutes/visit-register" ||
    path === "/institutions/xray-entry"; 

  const handleBack = () => {
    // If user is on admin login page, always go to main dashboard
    if (location.pathname === "/admin/login") {
      navigate("/");
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <div>
      <GlobalHeader />
      <div style={{ position: "relative" }}>
        {!hasLocalBackButton && (
          <button
            type="button"
            className="global-back-btn"
            onClick={handleBack}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D6E0F0",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "14px",
              color: "#1F2933",
              lineHeight: 1.2,
              cursor: "pointer",
              position: "absolute",
              top: "12px",
              left: "12px",
              zIndex: 2
            }}
          >
            &larr; Back
          </button>
        )}
        <Outlet />
      </div>
    </div>
  );
}

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <AppShell />,
      children: [
        {
          index: true,
          element: <Home_main_page />
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
          path:"/institutes/doctor-diagnosis",
          element:<DoctorDiagnosis/>
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
        },
        {
          path: "/institutes/doctor-prescription",
          element: <DoctorLayout />,
          children: [
            {
              index: true,
              element: <DoctorPrescriptionForm />
            }
          ]
        },{
          path:"/institutions/xray-entry",
          element:<XrayEntryForm/>
        },
        {
          element: <OthersLayout />,
          children: [
            {
              path: "/institutes/ledger",
              element: <InstituteLedger />
            },
            {
              path: "/institutes/indent",
              element: <InstituteIndent />
            },
            {
              path: "institutions/main-store",
              element: <MainStore />
            },
            {
              path: "/institutes/ai-insights",
              element: <AIInsights />
            },
            {
              path:"/institutes/medicines-issued-register",
              element:<MedicinesIssuedRegister/>
            },
            {
              path:"/institutes/inventory",
              element:<InstituteInventory/>
            },
            {
              path:"institutions/reports",
              element:<InstituteReports/>
            },
            {
              path: "/institutes/analytics",
              element: <InstituteAnalytics/>
            },
            {
              path: "/institutes/disease-analytics",
              element: <DiseaseAnalyticsHome />
            },
            {
              path: "/institutes/predict",
              element: <Predict/>
            },
            {
              path:"/institutes/forecast",
              element:<ForecastDashboard/>
            }
          ]
        },
        
        {path:"/institutes/visit-register",
          element:<VisitRegister/>
        },
        {
          path: "/institutes/add-password",
          element: <AddPasswords/>
        },
        {
          path:"/institutes/disease-analytics/:type",
          element:<DiseaseAnalyticsTable/>
        },
        { 
          path:"/institutes/disease-analytics/:type/:value",
          element:<DiseaseAnalyticsDetails/>
        },
        {
          path:"/institutes/disease-analytics/risk-hotspots",
          element:<RiskHotspots/>
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
          path: "employee/xray-report",
          element: <XrayReport />,
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
          path:"/institutes/add",
          element:<AddMainStoreMedicine/>
        },{
          path:"institutes/transfer",
          element:<TransferMainStoreMedicine/>
        },{
          path:"/institutes/analytics",
          element:<InstituteAnalytics/>
        },{
          path:"/admin/register",
          element:<AdminRegister/>
        },{
          path:"/admin/login",
          element:<AdminLogin/>
        },{
          path:"/admin/dashboard",
          element:<AdminDashboard/>
        },{
          path:"/admin/employee-reports",
          element:<EmployeeReports/>
        },{
          path:"/admin/employee-upload",
          element:<BulkEmployeeUpload/>
        },{
          path:"/admin/institute-reports",
          element:<AdminInstituteReports/>
        },{
          path:"/admin/ai-insights",
          element:<AIInsights2/>
        },        {path:"/institutes/health-summary" ,
          element:<HealthSummary />},
        {
          path: "/admin/forgot-password",
          element: <ForgotPassword />
        },
        {
          path: "/employee/forgot-password",
          element: <ForgotPassword />
        },
        {
          path: "/institutes/forgot-password",
          element: <ForgotPassword />
        }

      ]
    }
  ]);

    return (
      <div>
        <RouterProvider router={router} />
      </div>
    );
  }

export default App;
