export const DEFAULT_XRAY_CATEGORIES = [
  "Head & Neck",
  "Chest & Thorax",
  "Upper Limb",
  "Lower Limb",
  "Spine",
  "Abdomen",
];

export const DEFAULT_XRAY_TYPES = [
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

const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export const mergeXrayTypes = (remoteTypes = []) => {
  const map = new Map();

  (remoteTypes || []).forEach((item) => {
    const key = `${normalizeKey(item?.Xray_Type)}||${normalizeKey(item?.Body_Part)}`;
    if (!key || key === "||") return;
    map.set(key, { ...item });
  });

  DEFAULT_XRAY_TYPES.forEach((item) => {
    const key = `${normalizeKey(item?.Xray_Type)}||${normalizeKey(item?.Body_Part)}`;
    if (!key || key === "||") return;
    if (!map.has(key)) {
      map.set(key, { ...item });
      return;
    }

    const existing = map.get(key);
    map.set(key, {
      ...item,
      ...existing,
      category: existing?.category || item.category,
      subcategory: existing?.subcategory || item.subcategory
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    const partCompare = String(a?.Body_Part || "").localeCompare(String(b?.Body_Part || ""));
    if (partCompare !== 0) return partCompare;
    return String(a?.Xray_Type || "").localeCompare(String(b?.Xray_Type || ""));
  });
};

export default DEFAULT_XRAY_TYPES;