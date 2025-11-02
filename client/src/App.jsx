import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login_manu from "./components/manufacturer/Login_manu";
import Home_manu from "./components/manufacturer/Home_manu";
import Home_main_page from "./components/Home_main_page";
import Register_manu from "./components/manufacturer/Register";
import Institutes_list from "./components/manufacturer/Institutes_list";
import Add_medicine from "./components/manufacturer/Add_medicine";
import Medicines_table from "./components/manufacturer/Medicines_table";

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
          path: "add-medicine",
          element: <Add_medicine />,
        },
        {
          path:"manufacturer_medicine_table",
          element:<Medicines_table />
        }
      ]
    },
  ]);

    return (
      <div>
        <RouterProvider router={router} />
      </div>
    );
  }

export default App;
