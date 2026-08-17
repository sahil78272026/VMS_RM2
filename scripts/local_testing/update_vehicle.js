const fs = require('fs');

let code = fs.readFileSync('mobile/src/screens/guard/index.tsx', 'utf8');

// Update 1: Awaiting Decision Cards
const oldPending = `                      <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 1 }}>
                        📞 {log.visitor?.phone}
                      </Text>`;
                      
const newPending = `                      <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 1 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? \` · 🚗 \${log.vehicle_number}\` : ''}
                      </Text>`;

if (code.includes(oldPending)) {
    code = code.replace(oldPending, newPending);
    console.log("Updated pending cards");
} else {
    console.log("Could not find pending block");
}

// Update 2: Recent Gate Log / All Today / Inside
const oldRecent = `                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                  <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                    Flat {log.flat?.flat_number} · {log.purpose}
                  </Text>`;
                  
const newRecent = `                  <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>{log.visitor?.name}</Text>
                  <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                    Flat {log.flat?.flat_number} · {log.purpose}
                    {log.vehicle_number ? \` · 🚗 \${log.vehicle_number}\` : ''}
                  </Text>`;

if (code.includes(oldRecent)) {
    code = code.replace(oldRecent, newRecent);
    console.log("Updated recent cards");
} else {
    console.log("Could not find recent block");
}

fs.writeFileSync('mobile/src/screens/guard/index.tsx', code);
console.log("Finished updating vehicle numbers");
