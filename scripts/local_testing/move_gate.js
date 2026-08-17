const fs = require('fs');

let code = fs.readFileSync('mobile/src/screens/resident/index.tsx', 'utf8');

// 1. Remove dashboard tab from navigation
code = code.replace(
  "{ id: 'dashboard', label: 'Gate', icon: '🛡️' },\n",
  ""
);

// 2. Extract dashboard content
const dashboardRegex = /if \(currentTab === 'dashboard'\) \{[\s\S]*?return \(\n\s*<View>\n([\s\S]*?)<\/View>\n\s*\);\n\s*\}/;
const match = code.match(dashboardRegex);
if (!match) {
  console.log("Could not find dashboard tab");
  process.exit(1);
}
const gateContent = match[1];

// 3. Remove dashboard tab logic
code = code.replace(dashboardRegex, "");

// 4. Insert gateContent into home tab after Maintenance block (after line 519, where Announcements start)
const insertTarget = "{/* Announcements */}";
code = code.replace(insertTarget, gateContent + "\n          " + insertTarget);

fs.writeFileSync('mobile/src/screens/resident/index.tsx', code);
console.log("Moved gate content to home tab and removed gate tab.");
