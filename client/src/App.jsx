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
import FamilyMemberRegistration from "./components/employee/FamilyMemberRegistration";
import InstituteProfile from "./components/institutes/institute_profile";
import Institutes_placeorder from "./components/institutes/institute_placeorder";
import Institute_manufacture from "./components/institutes/institute_manufacture";

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
      path: "/manufacturer-home/:Manufacturer_Name",
      element: <Home_manu />,
      children:[
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
        path:"/employee-register",
        element:<EmployeeRegistration/>,
        children:[
          {
          path: "family-member-register",
          element: <FamilyMemberRegistration />,
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