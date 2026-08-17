const fs = require('fs');

function updateResident() {
    let code = fs.readFileSync('mobile/src/screens/resident/index.tsx', 'utf8');
    
    // Replace the simple wrap view with a more detailed one.
    const oldCode = `                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ color: Warm.textMuted, fontSize: 12 }}>
                      {log.purpose} · {new Date(log.created_at + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {log.status === 'exited' && log.actual_exit_at ? (
                      <Text style={{ color: Warm.textMuted, fontSize: 12, fontWeight: '700' }}>
                        • Exited: {new Date(log.actual_exit_at + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    ) : log.expected_exit_by ? (
                      <Text style={{ color: Warm.amber, fontSize: 12, fontWeight: '600' }}>
                        • Exit by: {new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    ) : null}
                  </View>
                  {log.is_force_approved && (
                    <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700', marginTop: 3 }}>
                      ⚠ Forced Entry: {log.force_approve_reason || 'No reason provided'}
                    </Text>
                  )}`;
                  
    const newCode = `                  <View style={{ marginTop: 2 }}>
                    <Text style={{ color: Warm.textMuted, fontSize: 12, marginBottom: 8 }}>
                      {log.purpose}
                      {log.expected_exit_by && !log.actual_exit_at ? \` · Exit by: \${new Date(log.expected_exit_by + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\` : ''}
                    </Text>

                    {/* Detailed Activity Timeline */}
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 4 }}>
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
                  </View>
                  {log.is_force_approved && (
                    <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700', marginTop: 6 }}>
                      ⚠ Forced Entry: {log.force_approve_reason || 'No reason provided'}
                    </Text>
                  )}`;
                  
    if (code.includes(oldCode)) {
        code = code.replace(oldCode, newCode);
        fs.writeFileSync('mobile/src/screens/resident/index.tsx', code);
        console.log("Updated Resident UI successfully.");
    } else {
        console.log("Could not find Resident oldCode string!");
    }
}

updateResident();
