const fs = require('fs');

let code = fs.readFileSync('mobile/src/screens/admin/index.tsx', 'utf8');

// 1. Rename tabs in nav
code = code.replace(
  "{ id: 'residents', label: 'Residents', icon: '👥' },\n            { id: 'maintenance', label: 'Dues', icon: '💰' }",
  "{ id: 'directory', label: 'Directory', icon: '🏢' }"
);

// 2. Change all setCurrentTab('residents') and setCurrentTab('maintenance') to setCurrentTab('directory')
code = code.replace(/setCurrentTab\('residents'\)/g, "setCurrentTab('directory')");
code = code.replace(/setCurrentTab\('maintenance'\)/g, "setCurrentTab('directory')");

// 3. Remove "Residents" block entirely and move "pendingResidents" into "directory" block
// Let's capture the pendingResidents block
const pendingBlockMatch = code.match(/(\s*\{pendingResidents\.length > 0 && \([\s\S]*?\n\s*\)\}\n)/);
let pendingBlock = "";
if (pendingBlockMatch) {
  pendingBlock = pendingBlockMatch[1];
}

// Remove the whole residents tab if statement
const resTabRegex = /if \(currentTab === 'residents'\) \{[\s\S]*?return \([\s\S]*?<\/View>\n\s*\);\n\s*\}\n/;
code = code.replace(resTabRegex, "");

// Rename maintenance tab to directory
code = code.replace(/if \(currentTab === 'maintenance'\)/g, "if (currentTab === 'directory')");

// Insert pendingBlock right inside the return of directory tab
code = code.replace(/(if \(currentTab === 'directory'\) \{\n\s*return \(\n\s*<View>\n)/, `$1${pendingBlock}`);

// Now modify the Flat item rendering logic inside directory tab
// I will replace the flat mapping return statement
const flatRenderRegex = /(return \(\n\s*<View\n\s*key=\{f\.id\}[\s\S]*?style=\{\{[\s\S]*?\}\}\n\s*>\n)[\s\S]*?(<\/View>\n\s*\);)/;

const newFlatRender = `$1
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: Warm.text, fontSize: 16 }}>Flat {f.flat_number}</Text>
                    <Text style={{ color: Warm.textMuted, fontSize: 12, marginTop: 2 }}>
                      {validUntil ? \`Valid through \${formatDate(validUntil)}\` : 'No active cycle recorded'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6, flexDirection: 'row' }}>
                    {f.residents?.length > 0 && (
                      <View style={{ backgroundColor: Warm.greenDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ color: Warm.green, fontSize: 11, fontWeight: '700' }}>ACTIVE</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: isExpired ? Warm.redDim : Warm.greenDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={{ color: isExpired ? Warm.red : Warm.green, fontSize: 11, fontWeight: '700' }}>
                        {isExpired ? 'EXPIRED' : 'PAID'}
                      </Text>
                    </View>
                    {isRenewable && (
                      <TouchableOpacity
                        onPress={() => { setForm({ flat_id: f.id, flat_number: f.flat_number, amount: 1200, months_added: 6 }); setModal('offline_payment'); }}
                        style={{ backgroundColor: Warm.accent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>OFFLINE PAY</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {f.residents?.length > 0 && (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: Warm.cardBorder, paddingTop: 12, gap: 8 }}>
                    {f.residents.map((r: any) => (
                      <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Avatar name={r.name} size={24} color={Warm.accent} />
                        <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: Warm.text }}>{r.name}</Text>
                        <Text style={{ marginLeft: 'auto', fontSize: 12, color: Warm.textMuted }}>📞 {r.phone}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );`;

code = code.replace(flatRenderRegex, newFlatRender);

fs.writeFileSync('mobile/src/screens/admin/index.tsx', code);
console.log("Done");
