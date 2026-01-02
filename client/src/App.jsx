import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login_manu from "./components/manufacturer/Login_manu";
import Home_manu from "./components/manufacturer/Home_manu";
import Home_main_page from "./components/Home_main_page";
import Register_manu from "./components/manufacturer/Register";
import InstituteRegister from "./components/institutes/institute_registration";
import InstituteLogin from "./components/institutes/institute_login";
import Institute_home from "./components/institutes/institute_home";
import Add_medicine from "./components/manufacturer/Add_medicine";
import Medicines_table from "./components/manufacturer/Medicines_table";
import Profile_manu from "./components/manufacturer/Profile_manu";
import EmployeeRegistration from "./components/employee/EmployeeRegistration";
import FamilyMemberRegistration from "./components/employee/FamilyRegistration";
import InstituteProfile from "./components/institutes/institute_profile";
import Institutes_placeorder from "./components/institutes/institute_placeorder";
import Institute_manufacture from "./components/institutes/institute_manufacture";
import OrdersInstitutes from './components/manufacturer/OrdersInstitutes'
import ManufacturerLayout from "./components/manufacturer/ManufacturerLayout";
import EmployeeLogin from "./components/employee/EmployeeLogin";
import EmployeeHome from "./components/employee/EmployeeHome";
import InstituteInventory from "./components/institutes/institute_inventory";
import PharmacyPrescriptionForm from "./components/institutes/PharmacyPrescriptionForm";
import DiagnosisEntryForm from "./components/institutes/DiagnosisEntryForm";
import PrescriptionReport from "./components/employee/PrescriptionReport";
import DiagnosisReport from './components/employee/DiagnosisReport'
import Diseases from "./components/institutes/Diseases";
import InstituteReports from "./components/institutes/institutions_reports";
import InstituteAnalytics from "./components/institutes/institute_analytics";
import InstituteLedger from "./components/institutes/InstituteLedger";
import MedicinesIssuedRegister from "./components/institutes/MedicinesIssuedRegister";
import EmployeeDiseaseReport from "./components/employee/EmployeeDiseaseReport";
import EmployeeProfile from "./components/employee/EmployeeProfile";
import FamilyMemberProfile from "./components/employee/FamilyMemberProfile";
import InstituteIndent from "./components/institutes/InstituteIndent";
function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home_main_page />,
    },
    {
      path: "/manufacturer-login",
      element: <Login_manu />,
    },
    {
      path: "/manufacturer-register",
      element: <Register_manu />,
    },
    {
      path: "/manufacturer-layout/:Manufacturer_Name",
      element: <ManufacturerLayout />,
      children:[
        {
          path: "home_manu",
          element: <Home_manu />,
        },
        {
          path: "add_medicine",
          element: <Add_medicine />,
        },
        {
          path:"manufacturer_medicine_table",
          element:<Medicines_table />
        },
        {
          path:"profile_manufacturer",
          element:<Profile_manu />
        },
        {
          path:"orders_institutes",
          element:<OrdersInstitutes />
        }
      ]
    },{
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
    },{
      path:"/institutes/placeorder",
      element:<Institutes_placeorder/>
    },
    {
      path:"/institutes/manufacturer-orders",
      element:<Institute_manufacture/>
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
    },{
      path:"institutions/analytics",
      element:<InstituteAnalytics/>
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
    }
  ]);

    return (
      <div>
        <RouterProvider router={router} />
      </div>
    );
  }

export default App;