import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PatientSelector from "../institutes/PatientSelector";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

const DEFAULT_XRAY_CATEGORIES = [
  "Head & Neck",
  "Chest & Thorax",
  "Upper Limb",
  "Lower Limb",
  "Spine",
  "Abdomen",
];

const DEFAULT_XRAY_TYPES = [
  { category: "Head & Neck", subcategory: "", Xray_Type: "Skull X-ray – AP view", Body_Part: "Skull", Side: "NA", View: "AP" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Skull X-ray – Lateral view (Right)", Body_Part: "Skull", Side: "Right", View: "Lateral" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Skull X-ray – Lateral view (Left)", Body_Part: "Skull", Side: "Left", View: "Lateral" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Skull X-ray – Towne view", Body_Part: "Skull", Side: "NA", View: "Towne" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Sinus X-ray – Waters view (occipitomental)", Body_Part: "Sinus", Side: "NA", View: "Waters" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Sinus X-ray – Caldwell view", Body_Part: "Sinus", Side: "NA", View: "Caldwell" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Sinus X-ray – Lateral view (Right)", Body_Part: "Sinus", Side: "Right", View: "Lateral" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Sinus X-ray – Lateral view (Left)", Body_Part: "Sinus", Side: "Left", View: "Lateral" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Cervical spine X-ray – AP view", Body_Part: "Cervical spine", Side: "NA", View: "AP" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Cervical spine X-ray – Lateral view (Right)", Body_Part: "Cervical spine", Side: "Right", View: "Lateral" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Cervical spine X-ray – Lateral view (Left)", Body_Part: "Cervical spine", Side: "Left", View: "Lateral" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Cervical spine X-ray – Oblique view (Right)", Body_Part: "Cervical spine", Side: "Right", View: "Oblique" },
  { category: "Head & Neck", subcategory: "", Xray_Type: "Cervical spine X-ray – Oblique view (Left)", Body_Part: "Cervical spine", Side: "Left", View: "Oblique" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – PA view", Body_Part: "Chest", Side: "NA", View: "PA" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – AP view", Body_Part: "Chest", Side: "NA", View: "AP" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – Lateral view (Right)", Body_Part: "Chest", Side: "Right", View: "Lateral" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – Lateral view (Left)", Body_Part: "Chest", Side: "Left", View: "Lateral" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – Decubitus view (Right)", Body_Part: "Chest", Side: "Right", View: "Decubitus" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – Decubitus view (Left)", Body_Part: "Chest", Side: "Left", View: "Decubitus" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – Lordotic view", Body_Part: "Chest", Side: "NA", View: "Lordotic" },
  { category: "Chest & Thorax", subcategory: "", Xray_Type: "Chest X-ray – Expiratory view", Body_Part: "Chest", Side: "NA", View: "Expiratory" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Right Shoulder X-ray – AP view", Body_Part: "Shoulder", Side: "Right", View: "AP" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Right Shoulder X-ray – Axillary view", Body_Part: "Shoulder", Side: "Right", View: "Axillary" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Left Shoulder X-ray – AP view", Body_Part: "Shoulder", Side: "Left", View: "AP" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Left Shoulder X-ray – Axillary view", Body_Part: "Shoulder", Side: "Left", View: "Axillary" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Right Humerus X-ray – AP view", Body_Part: "Humerus", Side: "Right", View: "AP" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Right Humerus X-ray – Lateral view", Body_Part: "Humerus", Side: "Right", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Left Humerus X-ray – AP view", Body_Part: "Humerus", Side: "Left", View: "AP" },
  { category: "Upper Limb", subcategory: "Shoulder & Arm", Xray_Type: "Left Humerus X-ray – Lateral view", Body_Part: "Humerus", Side: "Left", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Elbow", Xray_Type: "Right Elbow X-ray – Lateral view", Body_Part: "Elbow", Side: "Right", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Elbow", Xray_Type: "Right Elbow X-ray – AP", Body_Part: "Elbow", Side: "Right", View: "AP" },
  { category: "Upper Limb", subcategory: "Elbow", Xray_Type: "Left Elbow X-ray – AP view", Body_Part: "Elbow", Side: "Left", View: "AP" },
  { category: "Upper Limb", subcategory: "Elbow", Xray_Type: "Left Elbow X-ray – Lateral view", Body_Part: "Elbow", Side: "Left", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Right Forearm X-ray – AP view", Body_Part: "Forearm", Side: "Right", View: "AP" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Right Forearm X-ray – Lateral view", Body_Part: "Forearm", Side: "Right", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Left Forearm X-ray – AP view", Body_Part: "Forearm", Side: "Left", View: "AP" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Left Forearm X-ray – Lateral view", Body_Part: "Forearm", Side: "Left", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Right Wrist X-ray – PA view", Body_Part: "Wrist", Side: "Right", View: "PA" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Right Wrist X-ray – Lateral views", Body_Part: "Wrist", Side: "Right", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Right Wrist X-ray – Oblique view", Body_Part: "Wrist", Side: "Right", View: "Oblique" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Left Wrist X-ray – PA view", Body_Part: "Wrist", Side: "Left", View: "PA" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Left Wrist X-ray – Lateral views", Body_Part: "Wrist", Side: "Left", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Forearm & Wrist", Xray_Type: "Left Wrist X-ray – Oblique view", Body_Part: "Wrist", Side: "Left", View: "Oblique" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Right Hand X-ray – PA view", Body_Part: "Hand", Side: "Right", View: "PA" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Right Hand X-ray – Oblique view", Body_Part: "Hand", Side: "Right", View: "Oblique" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Right Hand X-ray – Lateral view", Body_Part: "Hand", Side: "Right", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Left Hand X-ray – PA view", Body_Part: "Hand", Side: "Left", View: "PA" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Left Hand X-ray – Oblique view", Body_Part: "Hand", Side: "Left", View: "Oblique" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Left Hand X-ray – Lateral view", Body_Part: "Hand", Side: "Left", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Right Finger X-ray – AP view", Body_Part: "Finger", Side: "Right", View: "AP" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Right Finger X-ray – Lateral view", Body_Part: "Finger", Side: "Right", View: "Lateral" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Left Finger X-ray – AP view", Body_Part: "Finger", Side: "Left", View: "AP" },
  { category: "Upper Limb", subcategory: "Hand & Fingers", Xray_Type: "Left Finger X-ray – Lateral view", Body_Part: "Finger", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Hip & Pelvis", Xray_Type: "Pelvis X-ray – AP view", Body_Part: "Pelvis", Side: "NA", View: "AP" },
  { category: "Lower Limb", subcategory: "Hip & Pelvis", Xray_Type: "Right Hip X-ray – AP view", Body_Part: "Hip", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Hip & Pelvis", Xray_Type: "Right Hip X-ray – Lateral view", Body_Part: "Hip", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Hip & Pelvis", Xray_Type: "Left Hip X-ray – AP view", Body_Part: "Hip", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Hip & Pelvis", Xray_Type: "Left Hip X-ray – Lateral view", Body_Part: "Hip", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Femur", Xray_Type: "Right Femur X-ray – AP view", Body_Part: "Femur", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Femur", Xray_Type: "Right Femur X-ray – Lateral view", Body_Part: "Femur", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Femur", Xray_Type: "Left Femur X-ray – AP view", Body_Part: "Femur", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Femur", Xray_Type: "Left Femur X-ray – Lateral view", Body_Part: "Femur", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Knee", Xray_Type: "Right Knee X-ray – AP view", Body_Part: "Knee", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Knee", Xray_Type: "Right Knee X-ray – Lateral view", Body_Part: "Knee", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Knee", Xray_Type: "Right Knee X-ray – Skyline view", Body_Part: "Knee", Side: "Right", View: "Skyline" },
  { category: "Lower Limb", subcategory: "Knee", Xray_Type: "Left Knee X-ray – AP view", Body_Part: "Knee", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Knee", Xray_Type: "Left Knee X-ray – Lateral view", Body_Part: "Knee", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Knee", Xray_Type: "Left Knee X-ray – Skyline view", Body_Part: "Knee", Side: "Left", View: "Skyline" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Right Tibia/Fibula X-ray – AP view", Body_Part: "Tibia/Fibula", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Right Tibia/Fibula X-ray – Lateral view", Body_Part: "Tibia/Fibula", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Left Tibia/Fibula X-ray – AP view", Body_Part: "Tibia/Fibula", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Left Tibia/Fibula X-ray – Lateral view", Body_Part: "Tibia/Fibula", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Right Ankle X-ray – AP view", Body_Part: "Ankle", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Right Ankle X-ray – Lateral view", Body_Part: "Ankle", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Right Ankle X-ray – Mortise view", Body_Part: "Ankle", Side: "Right", View: "Mortise" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Left Ankle X-ray – AP view", Body_Part: "Ankle", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Left Ankle X-ray – Lateral view", Body_Part: "Ankle", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Leg & Ankle", Xray_Type: "Left Ankle X-ray – Mortise view", Body_Part: "Ankle", Side: "Left", View: "Mortise" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Right Foot X-ray – AP view", Body_Part: "Foot", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Right Foot X-ray – Lateral view", Body_Part: "Foot", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Right Foot X-ray – Oblique view", Body_Part: "Foot", Side: "Right", View: "Oblique" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Left Foot X-ray – AP view", Body_Part: "Foot", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Left Foot X-ray – Lateral view", Body_Part: "Foot", Side: "Left", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Left Foot X-ray – Oblique view", Body_Part: "Foot", Side: "Left", View: "Oblique" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Right Toe X-ray – AP view", Body_Part: "Toe", Side: "Right", View: "AP" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Right Toe X-ray – Lateral view", Body_Part: "Toe", Side: "Right", View: "Lateral" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Left Toe X-ray – AP view", Body_Part: "Toe", Side: "Left", View: "AP" },
  { category: "Lower Limb", subcategory: "Foot & Toes", Xray_Type: "Left Toe X-ray – Lateral view", Body_Part: "Toe", Side: "Left", View: "Lateral" },
  { category: "Spine", subcategory: "", Xray_Type: "Cervical Spine X-ray – AP view", Body_Part: "Cervical Spine", Side: "NA", View: "AP" },
  { category: "Spine", subcategory: "", Xray_Type: "Cervical Spine X-ray – Lateral view", Body_Part: "Cervical Spine", Side: "NA", View: "Lateral" },
  { category: "Spine", subcategory: "", Xray_Type: "Cervical Spine X-ray – Oblique view", Body_Part: "Cervical Spine", Side: "NA", View: "Oblique" },
  { category: "Spine", subcategory: "", Xray_Type: "Thoracic Spine X-ray – AP", Body_Part: "Thoracic Spine", Side: "NA", View: "AP" },
  { category: "Spine", subcategory: "", Xray_Type: "Thoracic Spine X-ray – Lateral view", Body_Part: "Thoracic Spine", Side: "NA", View: "Lateral" },
  { category: "Spine", subcategory: "", Xray_Type: "Lumbar Spine X-ray – AP view", Body_Part: "Lumbar Spine", Side: "NA", View: "AP" },
  { category: "Spine", subcategory: "", Xray_Type: "Lumbar Spine X-ray – Lateral view", Body_Part: "Lumbar Spine", Side: "NA", View: "Lateral" },
  { category: "Spine", subcategory: "", Xray_Type: "Sacrum & Coccyx X-ray – AP view", Body_Part: "Sacrum & Coccyx", Side: "NA", View: "AP" },
  { category: "Spine", subcategory: "", Xray_Type: "Sacrum & Coccyx X-ray – Lateral view", Body_Part: "Sacrum & Coccyx", Side: "NA", View: "Lateral" },
  { category: "Abdomen", subcategory: "", Xray_Type: "Abdomen X-ray – Supine view", Body_Part: "Abdomen", Side: "NA", View: "Supine" },
  { category: "Abdomen", subcategory: "", Xray_Type: "Abdomen X-ray – Erect view", Body_Part: "Abdomen", Side: "NA", View: "Erect" },
  { category: "Abdomen", subcategory: "", Xray_Type: "Abdomen X-ray – Decubitus view", Body_Part: "Abdomen", Side: "NA", View: "Decubitus" },
];

const normalizeDefaultXrayId = (xray) =>
  `default-xray-${(xray.category || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(xray.Xray_Type || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const mergeXrayTypes = (remoteTypes = []) => {
  const map = new Map();

  remoteTypes.forEach((item) => {
    const key = `${item.Xray_Type}||${item.Body_Part}`;
    map.set(key, { ...item });
  });

  DEFAULT_XRAY_TYPES.forEach((item) => {
    const key = `${item.Xray_Type}||${item.Body_Part}`;
    if (!map.has(key)) {
      map.set(key, { ...item, _id: normalizeDefaultXrayId(item) });
    } else {
      const existing = map.get(key);
      if (!existing.category) existing.category = item.category;
      if (!existing.subcategory) existing.subcategory = item.subcategory;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const categoryA = DEFAULT_XRAY_CATEGORIES.indexOf(a.category || "Other");
    const categoryB = DEFAULT_XRAY_CATEGORIES.indexOf(b.category || "Other");
    if (categoryA !== categoryB) return categoryA - categoryB;
    if ((a.subcategory || "") !== (b.subcategory || "")) return (a.subcategory || "").localeCompare(b.subcategory || "");
    return (a.Xray_Type || "").localeCompare(b.Xray_Type || "");
  });
};

const XrayEntryForm = () => {
  const [instituteName, setInstituteName] = useState("");
  const [visitId, setVisitId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [pastRecords, setPastRecords] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tokenNumber, setTokenNumber] = useState(null);
  const [xrayTypes, setXrayTypes] = useState([]);
  const [xrayMaster, setXrayMaster] = useState([]);
  const [doctorXrays, setDoctorXrays] = useState([]);
  const [doctorXrayOrders, setDoctorXrayOrders] = useState([]);
  const [showDoctorNotes, setShowDoctorNotes] = useState({});
  const navigate = useNavigate();

  const groupedXrayOptions = useMemo(() => {
    const groups = {};

    (xrayMaster.length ? xrayMaster : mergeXrayTypes([])).forEach((xm) => {
      const category = xm.category || "";
      if (!category || category === "Other") return;
      groups[category] = groups[category] || [];
      groups[category].push(xm);
    });

    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => {
        if ((a.subcategory || "") !== (b.subcategory || "")) {
          return (a.subcategory || "").localeCompare(b.subcategory || "");
        }
        return (a.Xray_Type || "").localeCompare(b.Xray_Type || "");
      });
    });

    return groups;
  }, [xrayMaster]);



  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [formData, setFormData] = useState({
    Institute_ID: "",
    Employee_ID: "",
    IsFamilyMember: false,
    FamilyMember_ID: "",
    Xrays: [
      {
        Xray_Type: "",
        Body_Part: "",
        Side: "NA",
        View: "",
        Film_Size: "",
        Findings: "",
        Impression: "",
        Remarks: "",
      },
    ],
    Xray_Notes: "",
  });

  useEffect(() => {
    const localInstituteId =
      localStorage.getItem("instituteId");
    if (localInstituteId) {
      setFormData((s) => ({
        ...s,
        Institute_ID: localInstituteId,
      }));
      fetchInstituteName(localInstituteId);
        // ADD THIS
  fetchXrayTypes();
    }
  }, []);

  const fetchDoctorXrays = async (visitId) => {
  try {
    // Fetch from medical-actions API like pharmacy and diagnosis
    const res = await axios.get(
      `${BACKEND_URL}/api/medical-actions/visit/${visitId}`
    );

    console.log("Medical actions API Response:", res.data);
    
    const actions = res.data || [];
    
    // Filter for DOCTOR_XRAY actions
    const doctorXrayActions = actions.filter(a => a.action_type === "DOCTOR_XRAY");
    
    console.log("Doctor X-ray actions:", doctorXrayActions);
    
    // Set the orders (each action is an order with data containing xrays and notes)
    setDoctorXrayOrders(doctorXrayActions);
    
    // Extract xrays from all actions for the form
    const allXrays = doctorXrayActions.flatMap(action => action.data?.xrays || []);
    setDoctorXrays(allXrays);

  } catch (err) {
    console.error("Failed to fetch doctor xrays", err);
    setDoctorXrays([]);
    setDoctorXrayOrders([]);
  }
};

  const fetchInstituteName = async (id) => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/institute-api/institution/${id}`
      );
      setInstituteName(res.data?.Institute_Name || "");
    } catch (err) {
      console.error("Error fetching institute name:", err);
    }
  };
const fetchXrayTypes = async () => {
  try {
    const res = await axios.get(`${BACKEND_URL}/xray-api/types`);
    setXrayMaster(mergeXrayTypes(res.data || []));
    console.log("X-ray types fetched:", res.data?.length);
  } catch (err) {
    console.error("Error fetching X-ray types:", err);
    setXrayMaster(mergeXrayTypes([]));
  }
};


 const handleXrayChange = (index, field, value) => {
  setFormData(prev => {
    const updated = [...prev.Xrays];

    if (field === "Xray_ID") {
      const sel = xrayMaster.find(x => x._id === value);

      if (sel) {
        updated[index] = {
          ...updated[index],
          Xray_ID: sel._id,
          Xray_Type: sel.Xray_Type,
          Body_Part: sel.Body_Part,
          Side: sel.Side || "NA",
          View: sel.View || "",
          Film_Size: sel.Film_Size || ""
        };
      } else {
        updated[index] = {
          ...updated[index],
          Xray_ID: value || "",
          Xray_Type: value
            ? updated[index].Xray_Type
            : ""
        };
      }
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
    }

    return { ...prev, Xrays: updated };
  });
};


  const addXray = () => {
    setFormData((prev) => ({
      ...prev,
      Xrays: [
        ...prev.Xrays,
        {
          Xray_Type: "",
          Body_Part: "",
          Side: "NA",
          View: "",
          Film_Size: "",
          Findings: "",
          Impression: "",
          Remarks: "",
        },
      ],
    }));
  };

  const removeXray = (i) => {
    setFormData((prev) => ({
      ...prev,
      Xrays: prev.Xrays.filter(
        (_, idx) => idx !== i
      ),
    }));
  };

  const fetchPastRecords = async () => {
    if (!formData.Employee_ID) return;

    try {
      const res = await axios.get(
        `${BACKEND_URL}/xray-api/records/${formData.Employee_ID}?isFamily=${formData.IsFamilyMember}&familyId=${formData.FamilyMember_ID}`
      );
      setPastRecords(res.data || []);
      setShowHistory(true);
    } catch (err) {
      console.error(
        "Error fetching past records:",
        err
      );
    }
  };


  const handleSubmit = async (e) => {

e.preventDefault();

const fd = new FormData();

fd.append("Institute_ID",formData.Institute_ID);
fd.append("Employee_ID",formData.Employee_ID);
fd.append("IsFamilyMember",formData.IsFamilyMember);
fd.append("FamilyMember_ID",formData.FamilyMember_ID);
fd.append("Xray_Notes",formData.Xray_Notes);

// send xray data
fd.append("Xrays",JSON.stringify(formData.Xrays));

// send files
formData.Xrays.forEach((x,i)=>{

if(x.ReportFile){
fd.append("reports",x.ReportFile);
}

});

await axios.post(
`${BACKEND_URL}/xray-api/add`,
fd,
{
headers:{
"Content-Type":"multipart/form-data"
}
}
);

alert("✅ Xray saved");

};

  const handlePrint = () => {
    const section = document.getElementById("xray-print-section");
    if (!section) return;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>X-ray Entry</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            button { display: none !important; }
          </style>
        </head>
        <body>${section.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const formatDateDMY = (dateValue) => {
    if (!dateValue) return "—";
    const date = new Date(dateValue);
    if (isNaN(date)) return "—";

    const day = String(date.getDate()).padStart(
      2,
      "0"
    );
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  useEffect(() => {

  if (!doctorXrays || doctorXrays.length === 0) return;

  const populated = doctorXrays.map(x => {

    const master = xrayMaster.find(m => m._id === x.Xray_ID);

    return {
      Xray_ID: x.Xray_ID || "",
      Xray_Type: x.Xray_Type || "",
      Body_Part: master?.Body_Part || "",
      Side: master?.Side || "NA",
      View: master?.View || "",
      Film_Size: master?.Film_Size || "",
      Findings: "",
      Impression: "",
      Remarks: ""
    };

  });

  setFormData(prev => ({
    ...prev,
    Xrays: populated
  }));

}, [doctorXrays, xrayMaster]);

  return (
    
       <div className="container-fluid mt-2">
      {/* Back Button */}
      <button
        className="btn mb-3"
        onClick={() => navigate(-1)}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D6E0F0",
          borderRadius: "8px",
          padding: "6px 14px",
          fontSize: "14px",
          color: "#1F2933",
        }}
      >
        ← Back
      </button>
      <div className="row justify-content-center">
        {/* ================= HISTORY PANEL ================= */}
        {showHistory && (
          <div className="col-lg-4 mb-3">
            <div className="card shadow border-0 h-100">
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <strong>🩻 X-ray History</strong>
                <button
                  className="btn btn-sm btn-light"
                  onClick={() => setShowHistory(false)}
                >
                  ✕
                </button>
              </div>
              <div
                className="card-body"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                {!pastRecords || pastRecords.length === 0 ? (
                  <div className="text-muted text-center py-4">
                    📭 No previous records found.
                  </div>
                ) : (
                  pastRecords.map((record, index) => (
                    <div
                      key={record._id || index}
                      className="border-bottom pb-3 mb-3"
                    >
                      <div className="text-muted small mb-2">
                        📅 Date: {record?.createdAt ? formatDateDMY(record.createdAt) : "—"}
                      </div>
                      {record?.Xrays?.length > 0 ? (
                        record.Xrays.map((x, i) => (
                          <div key={i} className="mb-2 p-2 bg-light rounded">
                            <div className="fw-semibold text-dark">
                              {x?.Xray_Type || "X-ray"}
                            </div>
                            <small className="text-muted">
                              {x?.Body_Part || "N/A"}
                              {x?.View && ` (${x.View})`}
                            </small>
                            {x?.Findings && (
                              <div className="small text-secondary mt-1">
                                Findings: {x.Findings}
                              </div>
                            )}
                            {x?.Impression && (
                              <div className="small text-secondary">
                                Impression: {x.Impression}
                              </div>
                            )}
                            {x?.Reports?.length > 0 && (
                              <div className="mt-2">
                              {x.Reports.map((r,ri)=>(
                              <a
                              key={ri}
                              href={`${BACKEND_URL}${r.url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-outline-primary me-2"
                              >
                              📄 View Report
                              </a>
                              ))}
                              </div>
                              )}
                          </div>
                        ))
                      ) : (
                        <div className="text-muted small">
                          No X-ray details available
                        </div>
                      )}
                      {record?.Xray_Notes && (
                        <div className="mt-2 p-2 bg-light rounded small">
                          📝 Notes: {record.Xray_Notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= FORM ================= */}
        <div
          className={`mb-3 ${showHistory ? "col-lg-8" : "col-lg-10"}`}
          style={{ transition: "all 0.4s ease" }}
        >
          <div className="card shadow border-0">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🩻 X-ray Entry Form</h5>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={handlePrint}
              >
                🖨️ Print
              </button>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Institute */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">🏥 Institute</label>
                  <input
                    className="form-control"
                    value={instituteName || "Loading..."}
                    readOnly
                  />
                </div>

                {/* Patient Selector */}
                <div className="mb-4">
                  <PatientSelector
                    instituteId={formData.Institute_ID}
                    onlyXrayQueue={true}
                    onSelect={({ employee, visit }) => {
                      const vId = visit?._id || null;
                      const token =
                        visit?.token_no ||
                        visit?.Token_Number ||
                        null;

                      setVisitId(vId);
                      setTokenNumber(token);
                      setSelectedEmployee(employee);
                      setSelectedFamilyMember(
                        visit?.IsFamilyMember
                          ? visit.FamilyMember
                          : null
                      );
                      if (vId) {
                        fetchDoctorXrays(vId);
                      }
                      setFormData((prev) => ({
                        ...prev,
                        Employee_ID: employee._id,
                        IsFamilyMember: Boolean(
                          visit?.IsFamilyMember
                        ),
                        FamilyMember_ID:
                          visit?.IsFamilyMember
                            ? visit.FamilyMember?._id
                            : "",
                      }));
                    }}
                  />
                </div>

                {/* Selected Patient Info */}
                {selectedEmployee && (
                  <div className="alert alert-info mb-4">
                    <div className="row">
                      <div className="col-md-6">
                        <strong>👨 Employee:</strong> {selectedEmployee.Name}
                      </div>
                      <div className="col-md-3">
                        <strong>ID:</strong> {selectedEmployee.ABS_NO}
                      </div>
                      {tokenNumber && (
                        <div className="col-md-3">
                          <strong>🎫 Token:</strong> {tokenNumber}
                        </div>
                      )}
                    </div>
                    {formData.IsFamilyMember && selectedFamilyMember && (
                      <div className="row mt-2">
                        <div className="col-md-6">
                          <strong>👨‍👩‍👧 Family Member:</strong> {selectedFamilyMember.Name}
                        </div>
                        <div className="col-md-6">
                          <strong>Relation:</strong> {selectedFamilyMember.Relationship}
                        </div>
                      </div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchPastRecords}
                      >
                        📄 View History
                      </button>
                    </div>
                  </div>
                )}

                {/* Doctor X-ray Orders with Notes */}
                {doctorXrayOrders.length > 0 && (
                  <div className="alert alert-warning mb-4">
                    <h6 className="alert-heading">👨‍⚕️ Doctor X-ray Orders (Reference)</h6>
                    
                    {doctorXrayOrders.map((action, i) => (
                      <div key={i} className="mt-2">
                        <ul className="mb-2">
                          {(action.data?.xrays || []).map((xray, idx) => (
                            <li key={idx}>
                              {xray.Xray_Type} {xray.Body_Part ? `(${xray.Body_Part})` : ''}
                            </li>
                          ))}
                        </ul>

                        {action.data?.notes && (
                          <div className="mt-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => setShowDoctorNotes(prev => ({ ...prev, [i]: !prev[i] }))}
                            >
                              {showDoctorNotes[i] ? "Hide Doctor Notes" : "Show Doctor Notes"}
                            </button>
                            {showDoctorNotes[i] && (
                              <div className="alert alert-info mt-2 mb-0 p-2">
                                <small><strong>Doctor Notes:</strong> {action.data.notes}</small>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* X-ray Details */}
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
                    🩻 X-ray Details
                  </h6>

                  {formData.Xrays.map((x, i) => (
                    <div
                      key={i}
                      className="border rounded p-3 mb-3 bg-light"
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">X-ray #{i + 1}</h6>
                        {formData.Xrays.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeXray(i)}
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">X-ray Selection</label>
                          <select
                            className="form-select"
                            value={x.Xray_ID || ""}
                            onChange={(e) => handleXrayChange(i, "Xray_ID", e.target.value)}
                          >
                            <option value="">Select X-ray test (or type below)</option>
                            {Object.entries(groupedXrayOptions).map(([category, items]) => (
                              <optgroup label={category} key={category}>
                                {items.map((xm) => (
                                  <option key={xm._id} value={xm._id}>
                                    {xm.subcategory ? `${xm.subcategory}: ` : ""}{xm.Xray_Type} ({xm.Body_Part})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">X-ray Type</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="X-ray Type"
                            value={x.Xray_Type}
                            onChange={(e) => handleXrayChange(i, "Xray_Type", e.target.value)}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Body Part</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Body Part"
                            value={x.Body_Part}
                            onChange={(e) => handleXrayChange(i, "Body_Part", e.target.value)}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label fw-semibold">View</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="View (AP/PA)"
                            value={x.View}
                            onChange={(e) => handleXrayChange(i, "View", e.target.value)}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label fw-semibold">Film Size</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Film Size (10x8)"
                            value={x.Film_Size}
                            onChange={(e) => handleXrayChange(i, "Film_Size", e.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Findings</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Enter findings..."
                            value={x.Findings}
                            onChange={(e) => handleXrayChange(i, "Findings", e.target.value)}
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">Impression</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Enter impression..."
                            value={x.Impression}
                            onChange={(e) => handleXrayChange(i, "Impression", e.target.value)}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">Remarks</label>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Enter remarks..."
                            value={x.Remarks}
                            onChange={(e) => handleXrayChange(i, "Remarks", e.target.value)}
                          /><br/>
                          <div className="col-12">
                            <label className="form-label fw-semibold">
                            Upload X-ray Report
                            </label>

                            <input
                            type="file"
                            className="form-control"
                            onChange={(e)=>
                            handleXrayChange(
                            i,
                            "ReportFile",
                            e.target.files[0]
                            )
                            }
                            />

                            </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-outline-success me-2"
                    onClick={addXray}
                  >
                    ➕ Add Another X-ray
                  </button>
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">📝 X-ray Notes</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Enter X-ray notes..."
                    value={formData.Xray_Notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        Xray_Notes: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg px-5"
                  >
                    💾 Save X-ray Record
                  </button>
                </div>
              </form>

              {/* Hidden Print Section */}
              <div id="xray-print-section" style={{ display: "none" }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
                  🩻 X-ray Entry Report
                </h2>
                
                <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                  <h4>Institute Information</h4>
                  <p><strong>Institute Name:</strong> {instituteName || "N/A"}</p>
                </div>

                {selectedEmployee && (
                  <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                    <h4>Patient Information</h4>
                    <p><strong>Employee Name:</strong> {selectedEmployee.Name || "N/A"}</p>
                    <p><strong>ABS No:</strong> {selectedEmployee.ABS_NO || "N/A"}</p>
                    {tokenNumber && <p><strong>Token Number:</strong> {tokenNumber}</p>}
                    {formData.IsFamilyMember && selectedFamilyMember && (
                      <>
                        <p><strong>Family Member:</strong> {selectedFamilyMember.Name || "N/A"}</p>
                        <p><strong>Relationship:</strong> {selectedFamilyMember.Relationship || "N/A"}</p>
                      </>
                    )}
                  </div>
                )}

                {formData.Xrays.length > 0 && (
                  <div style={{ marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>
                    <h4>X-ray Details</h4>
                    {formData.Xrays.map((x, i) => (
                      <div key={i} style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                        <h6 style={{ marginBottom: "10px" }}>X-ray #{i + 1}</h6>
                        <table style={{ width: "100%", fontSize: "13px", marginBottom: "10px" }}>
                          <tbody>
                            <tr>
                              <td style={{ width: "30%", fontWeight: "bold", paddingBottom: "5px" }}>Type:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.Xray_Type || "N/A"}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: "bold", paddingBottom: "5px" }}>Body Part:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.Body_Part || "N/A"}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: "bold", paddingBottom: "5px" }}>View:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.View || "N/A"}</td>
                            </tr>
                            <tr>
                              <td style={{ fontWeight: "bold", paddingBottom: "5px" }}>Film Size:</td>
                              <td style={{ paddingBottom: "5px" }}>{x.Film_Size || "N/A"}</td>
                            </tr>
                            {x.Findings && (
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "5px", verticalAlign: "top" }}>Findings:</td>
                                <td style={{ paddingBottom: "5px", whiteSpace: "pre-wrap" }}>{x.Findings}</td>
                              </tr>
                            )}
                            {x.Impression && (
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "5px", verticalAlign: "top" }}>Impression:</td>
                                <td style={{ paddingBottom: "5px", whiteSpace: "pre-wrap" }}>{x.Impression}</td>
                              </tr>
                            )}
                            {x.Remarks && (
                              <tr>
                                <td style={{ fontWeight: "bold", paddingBottom: "5px", verticalAlign: "top" }}>Remarks:</td>
                                <td style={{ paddingBottom: "5px", whiteSpace: "pre-wrap" }}>{x.Remarks}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {formData.Xray_Notes && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4>X-ray Notes</h4>
                    <p style={{ whiteSpace: "pre-wrap" }}>{formData.Xray_Notes}</p>
                  </div>
                )}

                <div style={{ marginTop: "30px", textAlign: "center", color: "#666", fontSize: "12px" }}>
                  <p>Generated on: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default XrayEntryForm;