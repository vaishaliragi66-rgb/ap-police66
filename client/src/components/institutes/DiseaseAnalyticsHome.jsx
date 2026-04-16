import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMasterDataMap, getMasterOptions } from "../../utils/masterData_clean";

function DiseaseAnalyticsHome() {

  const navigate = useNavigate();

  const [category, setCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [masterMap, setMasterMap] = useState({});
  const diseaseCategoryOptions = getMasterOptions(masterMap, "Disease Categories");

  useEffect(() => {
    let mounted = true;
    const loadMaster = async () => {
      try {
        const data = await fetchMasterDataMap({ force: true });
        if (mounted) setMasterMap(data || {});
      } catch {
        if (mounted) setMasterMap({});
      }
    };

    loadMaster();
    const onMasterUpdated = () => loadMaster();
    window.addEventListener("master-data-updated", onMasterUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("master-data-updated", onMasterUpdated);
    };
  }, []);

  const goToAge = () => {

    navigate("/institutes/disease-analytics/age", {
      state: { category, fromDate, toDate }
    });

  };

  const goToDesignation = () => {

    navigate("/institutes/disease-analytics/designation", {
      state: { category, fromDate, toDate }
    });

  };

  const goToRiskHotspots = () => {

    navigate("/institutes/disease-analytics/risk-hotspots", {
      state: { category, fromDate, toDate }
    });

  };

  return (

    <div className="container mt-4">

      <h3>Disease Analytics</h3>

      <div className="card p-3 mt-3">

        <h5>Filters</h5>

        <div className="row">

          <div className="col-md-4">

            <label>Disease Category</label>

            <select
              className="form-control"
              onChange={(e)=>setCategory(e.target.value)}
            >

              <option value="">All</option>
              {diseaseCategoryOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}

            </select>

          </div>

          <div className="col-md-4">

            <label>From Date</label>

            <input
              type="date"
              className="form-control"
              onChange={(e)=>setFromDate(e.target.value)}
            />

          </div>

          <div className="col-md-4">

            <label>To Date</label>

            <input
              type="date"
              className="form-control"
              onChange={(e)=>setToDate(e.target.value)}
            />

          </div>

        </div>

      </div>

      <div className="mt-4">

        <button
          className="btn btn-primary me-3"
          onClick={goToAge}
        >
          Analytics By Age
        </button>

        <button
          className="btn btn-success me-3"
          onClick={goToDesignation}
        >
          Analytics By Designation
        </button>

        <button
          className="btn btn-dark"
          onClick={goToRiskHotspots}
        >
          Risk Hotspots
        </button>

      </div>

    </div>

  );

}

export default DiseaseAnalyticsHome;