const fs = require('fs');

// 1. Guard App
let guardCode = fs.readFileSync('mobile/src/screens/guard/index.tsx', 'utf8');

const guardOldPending = `                      <Text style={{ color: Warm.accent, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                        Flat {log.flat?.flat_number} · {log.purpose}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 1 }}>
                        📞 {log.visitor?.phone}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ color: Warm.textDim, fontSize: 11 }}>
                          Logged: {formatTimestamp(log.created_at)}
                        </Text>
                        {log.expected_exit_by && (
                          <Text style={{ color: Warm.amber, fontSize: 11, fontWeight: '600' }}>
                            • Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                        )}
                      </View>`;

const guardNewPending = `                      <Text style={{ color: Warm.accent, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                        Flat {log.flat?.flat_number} · {log.purpose}
                        {log.expected_exit_by ? \` · Exit by: \${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\` : ''}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 11, marginTop: 1 }}>
                        📞 {log.visitor?.phone}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <Text style={{ color: Warm.textDim, fontSize: 11 }}>
                          Logged: {formatTimestamp(log.created_at)}
                        </Text>
                      </View>`;

if (guardCode.includes(guardOldPending)) {
    guardCode = guardCode.replace(guardOldPending, guardNewPending);
    fs.writeFileSync('mobile/src/screens/guard/index.tsx', guardCode);
    console.log("Updated Guard App");
} else {
    console.log("Could not find Guard pending block");
}

// 2. Resident App
let residentCode = fs.readFileSync('mobile/src/screens/resident/index.tsx', 'utf8');

const residentOldPending = `                      <Text style={{ color: Warm.accent, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                        Purpose: {log.purpose}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 14, marginTop: 4 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? \` · 🚗 \${log.vehicle_number}\` : ''}
                      </Text>`;

const residentNewPending = `                      <Text style={{ color: Warm.accent, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                        Purpose: {log.purpose}
                        {log.expected_exit_by ? \` · Exit by: \${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\` : ''}
                      </Text>
                      <Text style={{ color: Warm.textMuted, fontSize: 14, marginTop: 4 }}>
                        📞 {log.visitor?.phone}{log.vehicle_number ? \` · 🚗 \${log.vehicle_number}\` : ''}
                      </Text>`;

if (residentCode.includes(residentOldPending)) {
    residentCode = residentCode.replace(residentOldPending, residentNewPending);
    fs.writeFileSync('mobile/src/screens/resident/index.tsx', residentCode);
    console.log("Updated Resident App");
} else {
    console.log("Could not find Resident pending block");
}

