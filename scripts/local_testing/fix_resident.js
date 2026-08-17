const fs = require('fs');

let code = fs.readFileSync('mobile/src/screens/resident/index.tsx', 'utf8');

// 1. Add expandedLogId state
if (!code.includes('expandedLogId')) {
    code = code.replace(
        `const [loading, setLoading] = useState(true);`,
        `const [loading, setLoading] = useState(true);\n  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);`
    );
}

// 2. Replace the detailed timeline with the collapsed view
const oldActivity = `                    {/* Detailed Activity Timeline */}
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
                    </View>`;

const newActivity = `                    {/* Last Action Snippet & Expand Button */}
                    <TouchableOpacity 
                      onPress={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {log.actual_exit_at ? (
                          <>
                            <Text style={{ fontSize: 10 }}>🚪</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>Exited</Text> at {formatTimestamp(log.actual_exit_at)}</Text>
                          </>
                        ) : log.entered_at ? (
                          <>
                            <Text style={{ fontSize: 10 }}>🚶</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>Entered</Text> at {formatTimestamp(log.entered_at)}</Text>
                          </>
                        ) : log.approved_at ? (
                          <>
                            <Text style={{ fontSize: 10 }}>{log.approval_status === 'approved' ? '✅' : '❌'}</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>{log.approval_status === 'approved' ? 'Approved' : 'Denied'}</Text> at {formatTimestamp(log.approved_at)}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={{ fontSize: 10 }}>📝</Text>
                            <Text style={{ color: Warm.textMuted, fontSize: 11 }}><Text style={{ fontWeight: '700' }}>Logged</Text> at {formatTimestamp(log.created_at)}</Text>
                          </>
                        )}
                      </View>
                      <Text style={{ color: Warm.amber, fontSize: 10, fontWeight: '800' }}>
                        {expandedLogId === log.id ? 'HIDE ▴' : 'DETAILS ▾'}
                      </Text>
                    </TouchableOpacity>

                    {/* Detailed Activity Timeline */}
                    {expandedLogId === log.id && (
                      <View style={{ paddingTop: 8, gap: 4, marginTop: 4 }}>
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
                    )}`;

code = code.replace(oldActivity, newActivity);
fs.writeFileSync('mobile/src/screens/resident/index.tsx', code);
console.log('Done Resident');
