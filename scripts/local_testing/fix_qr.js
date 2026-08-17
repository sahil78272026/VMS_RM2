const fs = require('fs');

let code = fs.readFileSync('mobile/src/screens/guard/index.tsx', 'utf8');

const oldQrBlock = `    if (currentTab === 'qr') {
      const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://vmsrm2.netlify.app';

      if (!selectedQrGateId) {`;

const newQrBlock = `    if (currentTab === 'qr') {
      const baseUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://vmsrm2.netlify.app';
      const actualGateId = session?.gate_id || selectedQrGateId;
      const actualGateName = session?.gate?.name || (gates.find(g => g.id === actualGateId)?.name) || 'Gate';

      if (!actualGateId) {`;

code = code.replace(oldQrBlock, newQrBlock);

const oldQrUrl = `      const selectedGate = gates.find(g => g.id === selectedQrGateId);
      const qrUrl = \`\${baseUrl}?society_id=\${activeSocietyId}&gate_id=\${selectedQrGateId}\`;`;

const newQrUrl = `      const qrUrl = \`\${baseUrl}?society_id=\${activeSocietyId}&gate_id=\${actualGateId}\`;`;

code = code.replace(oldQrUrl, newQrUrl);

const oldChangeGate = `            <TouchableOpacity 
              onPress={() => setSelectedQrGateId(null)}
              style={{ alignSelf: 'flex-start', marginBottom: 16 }}
            >
              <Text style={{ color: Warm.amber, fontWeight: '700' }}>← Change Gate</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 20, fontWeight: '800', color: Warm.text, marginBottom: 6, textAlign: 'center' }}>
              Self Check-In QR
            </Text>
            <Text style={{ color: Warm.textMuted, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
              For {selectedGate?.name || 'Gate'}
            </Text>`;

const newChangeGate = `            {!session?.gate_id && (
              <TouchableOpacity 
                onPress={() => setSelectedQrGateId(null)}
                style={{ alignSelf: 'flex-start', marginBottom: 16 }}
              >
                <Text style={{ color: Warm.amber, fontWeight: '700' }}>← Change Gate</Text>
              </TouchableOpacity>
            )}

            <Text style={{ fontSize: 20, fontWeight: '800', color: Warm.text, marginBottom: 6, textAlign: 'center' }}>
              Self Check-In QR
            </Text>
            <Text style={{ color: Warm.textMuted, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
              For {actualGateName}
            </Text>`;

code = code.replace(oldChangeGate, newChangeGate);

fs.writeFileSync('mobile/src/screens/guard/index.tsx', code);
console.log("Fixed QR");
