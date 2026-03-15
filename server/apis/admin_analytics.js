const express = require("express");
const router = express.Router();
const Disease = require("../models/disease");
const Employee = require("../models/employee");




function buildMatch(req) {
  const { fromDate, toDate, category } = req.query;

  let match = { IsFamilyMember: false };

  if (category && category !== "All") {
    match.Category = category;
  }

  if (fromDate && toDate) {
    match.createdAt = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    };
  }

  return match;
}
// ==========================================
// 1️⃣ AGE ANALYTICS (ALL INSTITUTES)
// ==========================================

router.get("/overall/age", async (req, res) => {
  try {

    const matchStage = buildMatch(req);
    const { ageRange } = req.query;

    const pipeline = [

      { $match: matchStage },

      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },

      { $unwind: "$employee" },

      {
        $addFields: {
          age: {
            $dateDiff: {
              startDate: "$employee.DOB",
              endDate: "$$NOW",
              unit: "year"
            }
          }
        }
      },

      {
        $addFields: {
          ageRange: {
            $switch: {
              branches: [
                { case: { $lte: ["$age", 25] }, then: "20-25" },
                { case: { $lte: ["$age", 30] }, then: "26-30" },
                { case: { $lte: ["$age", 35] }, then: "31-35" },
                { case: { $lte: ["$age", 40] }, then: "36-40" }
              ],
              default: "40+"
            }
          }
        }
      }

    ];

    // ✅ APPLY AGE FILTER HERE
    if (ageRange && ageRange !== "All") {
      pipeline.push({
        $match: { ageRange: ageRange }
      });
    }

    pipeline.push(

      {
        $group: {
          _id: {
            ageRange: "$ageRange",
            disease: "$Disease_Name"
          },
          count: { $sum: 1 }
        }
      },
    
      {
        $group: {
          _id: "$_id.ageRange",
          diseases: {
            $push: {
              disease: "$_id.disease",
              count: "$count"
            }
          },
          maxCount: { $max: "$count" }
        }
      },
    
      {
        $project: {
          ageRange: "$_id",
          disease: {
            $reduce: {
              input: {
                $map: {
                  input: {
                    $filter: {
                      input: "$diseases",
                      cond: { $eq: ["$$this.count", "$maxCount"] }
                    }
                  },
                  as: "d",
                  in: "$$d.disease"
                }
              },
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] }
                ]
              }
            }
          },
          count: "$maxCount",
          _id: 0
        }
      }
    
    );

    const result = await Disease.aggregate(pipeline);

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});


// ==========================================
// 2️⃣ AREA ANALYTICS
// ==========================================
router.get("/overall/area", async (req, res) => {

  try {

    const matchStage = buildMatch(req);

    const result = await Disease.aggregate([

      { $match: matchStage },
    
      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },
    
      { $unwind: "$employee" },
    
      {
        $addFields: {
          districtNormalized: {
            $toLower: "$employee.Address.District"
          }
        }
      },
    
      {
        $group: {
          _id: {
            district: "$districtNormalized",
            disease: "$Disease_Name"
          },
          count: { $sum: 1 }
        }
      },
    
      {
        $group: {
          _id: "$_id.district",
          diseases: {
            $push: {
              disease: "$_id.disease",
              count: "$count"
            }
          },
          maxCount: { $max: "$count" }
        }
      },
    
      {
        $project: {
          district: "$_id",
          disease: {
            $reduce: {
              input: {
                $map: {
                  input: {
                    $filter: {
                      input: "$diseases",
                      cond: { $eq: ["$$this.count", "$maxCount"] }
                    }
                  },
                  as: "d",
                  in: "$$d.disease"
                }
              },
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] }
                ]
              }
            }
          },
          count: "$maxCount",
          _id: 0
        }
      }
    
    ]);

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }

});


// ==========================================
// 3️⃣ DESIGNATION ANALYTICS
// ==========================================

router.get("/overall/designation", async (req, res) => {

  try {

    const matchStage = buildMatch(req);

    const result = await Disease.aggregate([

      { $match: matchStage },
    
      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },
    
      { $unwind: "$employee" },
    
      {
        $group: {
          _id: {
            designation: "$employee.Designation",
            disease: "$Disease_Name"
          },
          count: { $sum: 1 }
        }
      },
    
      {
        $group: {
          _id: "$_id.designation",
          diseases: {
            $push: {
              disease: "$_id.disease",
              count: "$count"
            }
          },
          maxCount: { $max: "$count" }
        }
      },
    
      {
        $project: {
          designation: "$_id",
          disease: {
            $reduce: {
              input: {
                $map: {
                  input: {
                    $filter: {
                      input: "$diseases",
                      cond: { $eq: ["$$this.count", "$maxCount"] }
                    }
                  },
                  as: "d",
                  in: "$$d.disease"
                }
              },
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] }
                ]
              }
            }
          },
          count: "$maxCount",
          _id: 0
        }
      }
    
    ]);

    res.json(result);

  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }

});


// ==========================================
// 4️⃣ AGE × DESIGNATION ANALYTICS
// ==========================================



router.get("/age-details/:ageRange", async (req, res) => {
  try {

    const { ageRange } = req.params;

    const ranges = {
      "20-25": [20, 25],
      "26-30": [26, 30],
      "31-35": [31, 35],
      "36-40": [36, 40],
      "40+": [40, 100]
    };

    const [minAge, maxAge] = ranges[ageRange];

    const basePipeline = [

      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },

      { $unwind: "$employee" },

      {
        $addFields: {
          age: {
            $dateDiff: {
              startDate: "$employee.DOB",
              endDate: "$$NOW",
              unit: "year"
            }
          }
        }
      },

      {
        $match: {
          age: { $gte: minAge, $lte: maxAge }
        }
      }

    ];

    const diseases = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$Disease_Name", count: { $sum: 1 } } }
    ]);

    const designations = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$employee.Designation", count: { $sum: 1 } } }
    ]);

    const areas = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$employee.Address.District", count: { $sum: 1 } } }
    ]);

    res.json({
      diseases,
      designations,
      areas
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
});
router.get("/designation-details/:designation", async (req, res) => {
  try {

    const { designation } = req.params;

    const basePipeline = [

      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },

      { $unwind: "$employee" },

      {
        $match: {
          "employee.Designation": designation
        }
      },

      {
        $addFields: {
          age: {
            $dateDiff: {
              startDate: "$employee.DOB",
              endDate: "$$NOW",
              unit: "year"
            }
          }
        }
      },

      {
        $addFields: {
          ageRange: {
            $switch: {
              branches: [
                { case: { $lte: ["$age", 25] }, then: "20-25" },
                { case: { $lte: ["$age", 30] }, then: "26-30" },
                { case: { $lte: ["$age", 35] }, then: "31-35" },
                { case: { $lte: ["$age", 40] }, then: "36-40" }
              ],
              default: "40+"
            }
          }
        }
      }

    ];

    const diseases = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$Disease_Name", count: { $sum: 1 } } }
    ]);

    const ages = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$ageRange", count: { $sum: 1 } } }
    ]);

    const areas = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$employee.Address.District", count: { $sum: 1 } } }
    ]);

    res.json({
      diseases,
      ages,
      areas
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
});

router.get("/area-details/:district", async (req, res) => {
  try {

    const { district } = req.params;

    const basePipeline = [

      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },

      { $unwind: "$employee" },

      {
        $match: {
          $expr: {
            $eq: [
              { $toLower: "$employee.Address.District" },
              district.toLowerCase()
            ]
          }
        }
      },

      {
        $addFields: {
          age: {
            $dateDiff: {
              startDate: "$employee.DOB",
              endDate: "$$NOW",
              unit: "year"
            }
          }
        }
      },

      {
        $addFields: {
          ageRange: {
            $switch: {
              branches: [
                { case: { $lte: ["$age", 25] }, then: "20-25" },
                { case: { $lte: ["$age", 30] }, then: "26-30" },
                { case: { $lte: ["$age", 35] }, then: "31-35" },
                { case: { $lte: ["$age", 40] }, then: "36-40" }
              ],
              default: "40+"
            }
          }
        }
      }

    ];

    const diseases = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$Disease_Name", count: { $sum: 1 } } }
    ]);

    const ages = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$ageRange", count: { $sum: 1 } } }
    ]);

    const designations = await Disease.aggregate([
      ...basePipeline,
      { $group: { _id: "$employee.Designation", count: { $sum: 1 } } }
    ]);

    res.json({
      diseases,
      ages,
      designations
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
});
module.exports = router;