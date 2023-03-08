const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API 1
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT * 
    FROM state;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

//API 2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * 
    FROM state
    WHERE state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(state));
});

//API 3
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictQuery = `
    INSERT INTO
    district (district_name,state_id,cases,cured,active,deaths)
    VALUES
    (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
  const dbResponse = await db.run(addDistrictQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//API 4
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * 
    FROM district
    WHERE district_id = ${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//API 5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//API 6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE district 
    SET
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
    SELECT SUM(cases) AS totalCases,
    SUM(cured) AS totalCured,
    SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id = ${stateId};`;
  const stateStats = await db.get(getStateStatsQuery);
  response.send(stateStats);
});

//API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
    NATURAL JOIN
      state
    WHERE 
      district_id=${districtId};`;
  const state = await db.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
