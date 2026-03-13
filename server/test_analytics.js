const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Employee = require('./models/employee');
  const Prescription = require('./models/Prescription');
  const DiagnosticsRecord = require('./models/diagnostics_record');

  // Get the institute
  const Institute = require('./models/master_institute');
  const institute = await Institute.findOne({}).lean();
  console.log('Institute ID:', institute._id);

  // Test the aggregation pipeline for John
  const pipeline = [
    {
      $match: { Name: { $regex: /john/i } }
    },
    /* 🔹 Prescriptions */
    {
      $lookup: {
        from: "prescriptions",
        let: { empId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$Employee", "$$empId"] },
                  { $eq: ["$Institute", institute._id] },
                  { $eq: ["$IsFamilyMember", false] }
                ]
              }
            }
          }
        ],
        as: "prescriptions"
      }
    },

    /* 🔹 Diagnosis Records */
    {
      $lookup: {
        from: "diagnosisrecords",
        let: { empId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$Employee", "$$empId"] },
                  { $eq: ["$Institute", institute._id] },
                  { $eq: ["$IsFamilyMember", false] }
                ]
              }
            }
          }
        ],
        as: "diagnosis"
      }
    },

    /* 🔹 Include ONLY if any record exists */
    {
      $match: {
        $expr: {
          $or: [
            { $gt: [{ $size: "$prescriptions" }, 0] },
            { $gt: [{ $size: "$diagnosis" }, 0] }
          ]
        }
      }
    },

    /* 🔹 Derived Fields */
    {
      $addFields: {
        Age: {
          $cond: [
            { $ifNull: ["$DOB", false] },
            {
              $dateDiff: {
                startDate: "$DOB",
                endDate: "$$NOW",
                unit: "year"
              }
            },
            null
          ]
        }
      }
    },

    /* 🔹 Final Shape */
    {
      $project: {
        Role: { $literal: "Employee" },
        Name: "$Name",
        ABS_NO: { $ifNull: ["$ABS_NO", "N/A"] },

        District: { $ifNull: ["$Address.District", "N/A"] },
        State: { $ifNull: ["$Address.State", "N/A"] },

        Age: 1,
        Gender: "$Gender",
        Blood_Group: "$Blood_Group",
        Phone_No: "$Phone_No",
        Height: "$Height",
        Weight: "$Weight",

        Tests: {
          $reduce: {
            input: "$diagnosis",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this.Tests"] }
          }
        },

        Medicines: {
          $reduce: {
            input: "$prescriptions",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this.Medicines"] }
          }
        },
        First_Visit_Date: {
          $min: {
            $concatArrays: [
              {
                $map: {
                  input: "$diagnosis",
                  as: "d",
                  in: "$$d.createdAt"
                }
              },
              {
                $map: {
                  input: "$prescriptions",
                  as: "p",
                  in: "$$p.Timestamp"
                }
              }
            ]
          }
        },

        Last_Visit_Date: {
          $max: {
            $concatArrays: [
              {
                $map: {
                  input: "$diagnosis",
                  as: "d",
                  in: "$$d.createdAt"
                },
                },
                {
                  $map: {
                    input: "$prescriptions",
                    as: "p",
                    in: "$$p.Timestamp"
                  }
                }
              ]
            }
          }
        }
      }
    }
  ];

  const result = await Employee.aggregate(pipeline);
  console.log('Analytics result for John:', JSON.stringify(result, null, 2));

  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));