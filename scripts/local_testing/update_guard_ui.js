const fs = require('fs');

function updateGuard() {
    let code = fs.readFileSync('mobile/src/screens/guard/index.tsx', 'utf8');
    
    // 1. Inside/All tab
    const oldCode1 = `                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: Warm.textDim, fontSize: 11 }}>
                      {isInside ? 'Entered:' : 'Logged:'} {formatTimestamp(log.created_at)}
                    </Text>
                    {log.status === 'exited' && log.actual_exit_at ? (
                      <Text style={{ color: Warm.textMuted, fontSize: 11, fontWeight: '700' }}>
                        • Exited: {new Date(log.actual_exit_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    ) : log.expected_exit_by ? (
                      <Text style={{ color: Warm.amber, fontSize: 11, fontWeight: '600' }}>
                        • Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    ) : null}
                  </View>`;
                  
    const newCode1 = `                  <View style={{ marginTop: 2 }}>
                    <Text style={{ color: Warm.textDim, fontSize: 11, marginBottom: 8 }}>
                      {log.expected_exit_by && !log.actual_exit_at ? \`Exit by: \${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\` : ''}
                    </Text>

                    {/* Detailed Activity Timeline */}
                    <View style={{ borderTopWidth: 1, borderTopColor: Warm.cardBorder, paddingTop: 8, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10 }}>📝</Text>
                        <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                          <Text style={{ fontWeight: '700' }}>Logged</Text> by {log.approval_source === 'self_checkin' ? 'Visitor (Self)' : (log.guard_name || 'Guard')} at {formatTimestamp(log.created_at)}
                        </Text>
                      </View>

                      {log.approved_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>{log.approval_status === 'approved' ? '✅' : '❌'}</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>{log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text> by {log.approver_name || 'Resident'} at {formatTimestamp(log.approved_at)}
                          </Text>
                        </View>
                      )}

                      {log.entered_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>🚶</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>Entered</Text> at {formatTimestamp(log.entered_at)}
                          </Text>
                        </View>
                      )}

                      {log.actual_exit_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>🚪</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)}
                            {log.exit_confirmed_by ? \` (Marked by \${log.exit_confirmed_by})\` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>`;
                  
    if (code.includes(oldCode1)) {
        code = code.replace(oldCode1, newCode1);
    } else {
        console.log("Could not find Guard oldCode1 string!");
    }
    
    // 2. Recent Gate Activity
    const oldCode2 = `                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: Warm.textMuted, fontSize: 12 }}>
                      Flat {log.flat?.flat_number} · {log.purpose}
                    </Text>
                    {log.expected_exit_by && (
                      <Text style={{ color: Warm.amber, fontSize: 12, fontWeight: '600' }}>
                        • Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    )}
                  </View>`;
                  
    const newCode2 = `                  <View style={{ marginTop: 2 }}>
                    <Text style={{ color: Warm.textMuted, fontSize: 12, marginBottom: 8 }}>
                      Flat {log.flat?.flat_number} · {log.purpose}
                      {log.expected_exit_by && !log.actual_exit_at ? \` · Exit by: \${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\` : ''}
                    </Text>

                    {/* Detailed Activity Timeline */}
                    <View style={{ borderTopWidth: 1, borderTopColor: Warm.cardBorder, paddingTop: 8, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10 }}>📝</Text>
                        <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                          <Text style={{ fontWeight: '700' }}>Logged</Text> by {log.approval_source === 'self_checkin' ? 'Visitor (Self)' : (log.guard_name || 'Guard')} at {formatTimestamp(log.created_at)}
                        </Text>
                      </View>

                      {log.approved_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>{log.approval_status === 'approved' ? '✅' : '❌'}</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>{log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text> by {log.approver_name || 'Resident'} at {formatTimestamp(log.approved_at)}
                          </Text>
                        </View>
                      )}

                      {log.entered_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>🚶</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>Entered</Text> at {formatTimestamp(log.entered_at)}
                          </Text>
                        </View>
                      )}

                      {log.actual_exit_at && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>🚪</Text>
                          <Text style={{ color: Warm.textMuted, fontSize: 11 }}>
                            <Text style={{ fontWeight: '700' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)}
                            {log.exit_confirmed_by ? \` (Marked by \${log.exit_confirmed_by})\` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>`;

    if (code.includes(oldCode2)) {
        code = code.replace(oldCode2, newCode2);
    } else {
        console.log("Could not find Guard oldCode2 string!");
    }

    fs.writeFileSync('mobile/src/screens/guard/index.tsx', code);
    console.log("Updated Guard UI successfully.");
}

updateGuard();
