const Disease = require("../models/disease");
const mongoose = require("mongoose");

const buildFilter = (instituteId, category, fromDate, toDate) => {

  let filter = {
    Institute_ID: new mongoose.Types.ObjectId(instituteId)
  };

  if (category) filter.Category = category;

  if (fromDate || toDate) {

    filter.createdAt = {};

    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);

  }

  return filter;

};

/*
AGE SUMMARY
*/

exports.ageSummary = async (req, res) => {

  try {

    const { instituteId, category, fromDate, toDate } = req.query;

    const filter = buildFilter(instituteId, category, fromDate, toDate);

    const data = await Disease.aggregate([

      { $match: filter },

      {
        $group: {
          _id: {
            employee: "$Employee_ID",
            disease: "$Disease_Name"
          }
        }
      },

      {
        $lookup: {
          from: "employees",
          localField: "_id.employee",
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
      },

      {
        $group: {
          _id: {
            ageRange: "$ageRange",
            disease: "$_id.disease"
          },
          count: { $sum: 1 }
        }
      },

      { $sort: { count: -1 } },

      {
        $group: {
          _id: "$_id.ageRange",
          disease: { $first: "$_id.disease" },
          count: { $first: "$count" }
        }
      }

    ]);

    res.json(data);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }

};

/*
AGE DETAILS
*/

exports.ageDetails = async (req, res) => {

  try {

    const { range } = req.params;
    const { instituteId, category, fromDate, toDate } = req.query;

    const filter = buildFilter(instituteId, category, fromDate, toDate);

    const pipeline = [

      { $match: filter },

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
      },

      { $match: { ageRange: range } }

    ];

    const diseaseDistribution = await Disease.aggregate([
      ...pipeline,
      { $group: { _id: "$Disease_Name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const designationDistribution = await Disease.aggregate([
      ...pipeline,
      { $group: { _id: "$employee.Designation", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      diseaseDistribution,
      designationDistribution
    });

  } catch (err) {

    res.status(500).json({ error: "Server error" });

  }

};

/*
DESIGNATION SUMMARY
*/

exports.designationSummary = async (req, res) => {

  try {

    const { instituteId, category, fromDate, toDate } = req.query;

    const filter = buildFilter(instituteId, category, fromDate, toDate);

    const data = await Disease.aggregate([

      { $match: filter },

      {
        $group: {
          _id: {
            employee: "$Employee_ID",
            disease: "$Disease_Name"
          }
        }
      },

      {
        $lookup: {
          from: "employees",
          localField: "_id.employee",
          foreignField: "_id",
          as: "employee"
        }
      },

      { $unwind: "$employee" },

      {
        $group: {
          _id: {
            designation: "$employee.Designation",
            disease: "$_id.disease"
          },
          count: { $sum: 1 }
        }
      },

      { $sort: { count: -1 } },

      {
        $group: {
          _id: "$_id.designation",
          disease: { $first: "$_id.disease" },
          count: { $first: "$count" }
        }
      }

    ]);

    res.json(data);

  } catch (err) {

    res.status(500).json({ error: "Server error" });

  }

};

/*
DESIGNATION DETAILS
*/

exports.designationDetails = async (req, res) => {

  try {

    const { designation } = req.params;
    const { instituteId, category, fromDate, toDate } = req.query;

    const filter = buildFilter(instituteId, category, fromDate, toDate);

    const pipeline = [

      { $match: filter },

      {
        $lookup: {
          from: "employees",
          localField: "Employee_ID",
          foreignField: "_id",
          as: "employee"
        }
      },

      { $unwind: "$employee" },

      { $match: { "employee.Designation": designation } },

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

    const diseaseDistribution = await Disease.aggregate([
      ...pipeline,
      { $group: { _id: "$Disease_Name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const ageDistribution = await Disease.aggregate([
      ...pipeline,
      { $group: { _id: "$ageRange", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      diseaseDistribution,
      ageDistribution
    });

  } catch (err) {

    res.status(500).json({ error: "Server error" });

  }

};

exports.riskHotspots = async (req, res) => {

  try {

    const { instituteId, category, fromDate, toDate } = req.query;

    const filter = buildFilter(instituteId, category, fromDate, toDate);

    const designationRisk = await Disease.aggregate([
      { $match: filter },
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
          _id: "$employee.Designation",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const ageRisk = await Disease.aggregate([

        { $match: filter },

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
                    { case: { $lte: ["$age", 40] }, then: "36-40" },
                    { case: { $lte: ["$age", 45] }, then: "41-45" }
                ],
                default: "46+"
                }
            }
            }
        },

        {
            $group: {
            _id: "$ageRange",
            count: { $sum: 1 }
            }
        },

        { $sort: { count: -1 } }

        ]);

    const diseaseRisk = await Disease.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$Disease_Name",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const severityDistribution = await Disease.aggregate([

    { $match: filter },

    {
    $group: {
    _id: "$Severity_Level",
    count: { $sum: 1 }
    }
    },

    { $sort: { count: -1 } }

    ]);

    res.json({
      designationRisk,
      ageRisk,
      diseaseRisk,
      severityData: severityDistribution
    });

  } catch (err) {

    res.status(500).json({ error: "Server error" });

  }

};