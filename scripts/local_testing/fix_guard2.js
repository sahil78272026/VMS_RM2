const fs = require('fs');
let code = fs.readFileSync('mobile/src/screens/guard/index.tsx', 'utf8');

const oldStr = `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {log.actual_exit_at ? (`;

const newStr = `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {expandedLogId === log.id ? (
                          <Text style={{ color: Warm.textMuted, fontSize: 11, fontWeight: '700' }}>Activity Log</Text>
                        ) : log.actual_exit_at ? (`;

code = code.split(oldStr).join(newStr);
fs.writeFileSync('mobile/src/screens/guard/index.tsx', code);
console.log('Fixed guard double text');
