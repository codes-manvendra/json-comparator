import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  Select,
  MenuItem,
  Tabs,
  Tab,
  InputAdornment,
  FormHelperText,
  CircularProgress,
} from "@mui/material";

const JsonComparator = () => {
  const [baseJson, setBaseJson] = useState("{}");
  const [compareJson, setCompareJson] = useState("{}");
  const [result, setResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Missing Keys");
  const [activeTab, setActiveTab] = useState("jsonCompare");
  const [configDomain1, setConfigDomain1] = useState("");
  const [configDomain2, setConfigDomain2] = useState("");
  const [masterDomain1, setMasterDomain1] = useState("");
  const [masterDomain2, setMasterDomain2] = useState("");
  const [limit, setLimit] = useState(10); // default limit
  const [loading, setLoading] = useState(false); // New loading state

  const handleTabChange = (event, newTab) => {
    setActiveTab(newTab);
    setResult(null); // Clear previous results when switching tabs
  };

  const fetchJsonFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch JSON");
      return await response.json();
    } catch (error) {
      console.error("Error fetching JSON:", error);
      return null;
    }
  };

  const handleCompare = async () => {
    setLoading(true); // Set loading state to true when comparison starts
    try {
      let baseObj, compareObj;
      if (activeTab === "jsonCompare") {
        baseObj = JSON.parse(baseJson);
        compareObj = JSON.parse(compareJson);
      } else if (activeTab === "configCompare") {
        const url1 = `https://${configDomain1}/crm-ui/configs/env.config.json`;
        const url2 = `https://${configDomain2}/crm-ui/configs/env.config.json`;
        baseObj = await fetchJsonFromUrl(url1);
        compareObj = await fetchJsonFromUrl(url2);
      } else if (activeTab === "masterCompare") {
        const url1 = `https://${masterDomain1}/api/crm-master-data/1.0.0/getAll?&limit=${limit}&offset=0&sort=-internalId`;
        const url2 = `https://${masterDomain2}/api/crm-master-data/1.0.0/getAll?&limit=${limit}&offset=0&sort=-internalId`;
        baseObj = await fetchJsonFromUrl(url1);
        compareObj = await fetchJsonFromUrl(url2);
      }

      if (!baseObj || !compareObj) {
        setResult({ error: "Failed to fetch or parse JSON." });
        setLoading(false); // Set loading to false after processing
        return;
      }

      setResult(compareObjects(baseObj, compareObj));
      setLoading(false); // Set loading to false after comparison is done
    } catch (error) {
      setResult({ error: "Invalid JSON format or error in comparison." });
      setLoading(false); // Set loading to false after error
    }
  };

  const highlightDifference = (baseStr, compareStr) => {
    let baseArr = baseStr.split("");
    let compareArr = compareStr.split("");
    let highlightedBase = "";
    let highlightedCompare = "";

    for (let i = 0; i < Math.max(baseArr.length, compareArr.length); i++) {
      if (baseArr[i] !== compareArr[i]) {
        highlightedBase += `<span style='background-color: #ccffcc; padding: 2px;'>${
          baseArr[i] || ""
        }</span>`;
        highlightedCompare += `<span style='background-color: #ffcccc; padding: 2px;'>${
          compareArr[i] || ""
        }</span>`;
      } else {
        highlightedBase += baseArr[i] || "";
        highlightedCompare += compareArr[i] || "";
      }
    }
    return { highlightedBase, highlightedCompare };
  };

  const compareObjects = (base, compare) => {
    let missingKeys = [];
    let extraKeys = [];
    let valueDifferences = [];

    const traverse = (baseObj, compareObj, path = "") => {
      for (const key in baseObj) {
        if (!(key in compareObj)) {
          missingKeys.push({
            key: `${path}${key}`,
            value: JSON.stringify(baseObj[key]),
          });
        } else if (
          typeof baseObj[key] === "object" &&
          typeof compareObj[key] === "object" &&
          baseObj[key] !== null &&
          compareObj[key] !== null
        ) {
          traverse(baseObj[key], compareObj[key], `${path}${key}.`);
        } else if (baseObj[key] !== compareObj[key]) {
          const { highlightedBase, highlightedCompare } = highlightDifference(
            JSON.stringify(baseObj[key]),
            JSON.stringify(compareObj[key])
          );
          valueDifferences.push({
            key: `${path}${key}`,
            base: highlightedBase,
            compare: highlightedCompare,
          });
        }
      }
      for (const key in compareObj) {
        if (!(key in baseObj)) {
          extraKeys.push({
            key: `${path}${key}`,
            value: JSON.stringify(compareObj[key]),
          });
        }
      }
    };

    traverse(base, compare);
    return { missingKeys, extraKeys, valueDifferences };
  };

  const renderTable = (data, headers) => (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  backgroundColor: "#f0f0f0",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              {headers.map((header, idx) => (
                <td
                  key={idx}
                  style={{
                    border: "1px solid black",
                    padding: "8px",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                  dangerouslySetInnerHTML={{
                    __html:
                      item[header.toLowerCase().replace(" ", "")] ||
                      item[header.toLowerCase()] ||
                      "N/A",
                  }}
                ></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="compare-tabs"
      >
        <Tab value="jsonCompare" label="JSON Compare" />
        <Tab value="configCompare" label="Config Compare" />
        {/* <Tab value="masterCompare" label="Master Compare" /> */}
      </Tabs>

      {activeTab === "jsonCompare" && (
        <>
          <TextField
            label="Base JSON"
            multiline
            rows={6}
            value={baseJson}
            onChange={(e) => setBaseJson(e.target.value)}
          />
          <TextField
            label="Comparison JSON"
            multiline
            rows={6}
            value={compareJson}
            onChange={(e) => setCompareJson(e.target.value)}
          />
        </>
      )}

      {activeTab === "configCompare" && (
        <>
          <TextField
            label="Config Domain 1"
            value={configDomain1}
            onChange={(e) => setConfigDomain1(e.target.value)}
            sx={{ width: "40%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">https://</InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  /crm-ui/configs/env.config.json
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Config Domain 2"
            value={configDomain2}
            onChange={(e) => setConfigDomain2(e.target.value)}
            sx={{ width: "40%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">https://</InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  /crm-ui/configs/env.config.json
                </InputAdornment>
              ),
            }}
          />
        </>
      )}

      {activeTab === "masterCompare" && (
        <>
          <TextField
            label="Master Domain 1"
            value={masterDomain1}
            onChange={(e) => setMasterDomain1(e.target.value)}
            sx={{ width: "55%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">https://</InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  /api/crm-master-data/1.0.0/getAll?&limit={limit}
                  &offset=0&sort=-internalId
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Master Domain 2"
            value={masterDomain2}
            onChange={(e) => setMasterDomain2(e.target.value)}
            sx={{ width: "55%" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">https://</InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  /api/crm-master-data/1.0.0/getAll?&limit={limit}
                  &offset=0&sort=-internalId
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Limit"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            sx={{ width: "10%" }}
          />
          <FormHelperText
            sx={{ fontSize: "small" }}
            style={{ color: "#1976d2" }}
          >
            Please enter the number of latest master data entries you need to
            compare in <bold>Limit</bold> field, default value is 10.
          </FormHelperText>
        </>
      )}

      <Button variant="contained" onClick={handleCompare}>
        Compare
      </Button>

      {loading ? (
        <CircularProgress />
      ) : (
        result && (
          <Paper sx={{ p: 2 }}>
            {result.error ? (
              <Typography color="error">{result.error}</Typography>
            ) : (
              <>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="Missing Keys">Missing Keys</MenuItem>
                  <MenuItem value="Value Differences">
                    Value Differences
                  </MenuItem>
                  <MenuItem value="Extra Keys">Extra Keys</MenuItem>
                </Select>
                {selectedCategory === "Missing Keys" &&
                  renderTable(result.missingKeys, ["Key", "Value"])}
                {selectedCategory === "Extra Keys" &&
                  renderTable(result.extraKeys, ["Key", "Value"])}
                {selectedCategory === "Value Differences" &&
                  renderTable(result.valueDifferences, [
                    "Key",
                    "Base",
                    "Compare",
                  ])}
              </>
            )}
          </Paper>
        )
      )}
    </Box>
  );
};

export default JsonComparator;
