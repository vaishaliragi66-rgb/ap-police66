const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ap-police')
.then(async () => {
  const Employee = require('./models/employee');
  const Institute = require('./models/master_institute');
  const institute = await Institute.findOne({}).lean();
  console.log('Institute ID:', institute._id);

  // Simple aggregation test
  const result = await Employee.aggregate([
    { $match: { Name: { $regex: /john/i } } },
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
                  { $eq: ["$Institute", institute._id] }
                ]
              }
            }
          }
        ],
        as: "prescriptions"
      }
    },
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
                  { $eq: ["$Institute", institute._id] }
                ]
              }
            }
          }
        ],
        as: "diagnosis"
      }
    },
    {
      $project: {
        Name: 1,
        prescriptions: { $size: "$prescriptions" },
        diagnosis: { $size: "$diagnosis" },
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
        }
      }
    }
  ]);

  console.log('Result:', JSON.stringify(result, null, 2));
  mongoose.disconnect();
})
.catch(err => console.error('Error:', err));