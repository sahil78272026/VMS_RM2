
export default function ProductLandingPage() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#F4F0EA', color: '#1E293B', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5DFD7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '28px' }}>🏢</div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#0284C7', letterSpacing: '-0.5px' }}>RM2 Secure</h1>
        </div>
        <a href="https://drive.google.com/file/d/1hxaqqpm6tUORbI1P2AoHpcm4jMpt-54I/view?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', padding: '12px 24px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, transition: '0.2s', boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)' }}>Download App</a>
      </header>

      {/* Hero */}
      <section style={{ flex: 1, padding: '100px 20px', textAlign: 'center', background: 'linear-gradient(145deg, #F4F0EA 0%, #E0F2FE 100%)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.8s ease-out' }}>
          <div style={{ display: 'inline-block', backgroundColor: '#DCFCE7', color: '#10B981', padding: '8px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '14px', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Next-Gen Society Management
          </div>
          <h2 style={{ fontSize: '56px', fontWeight: 900, marginBottom: '24px', lineHeight: 1.1, color: '#0F172A', letterSpacing: '-1.5px' }}>
            The Modern Visitor & Amenities Platform
          </h2>
          <p style={{ fontSize: '22px', color: '#475569', marginBottom: '48px', lineHeight: 1.6 }}>
            Seamless QR check-ins, multi-tenant architecture, robust guard terminals, and a unified resident directory. Upgrade your community's security experience today.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <a href="https://drive.google.com/file/d/1hxaqqpm6tUORbI1P2AoHpcm4jMpt-54I/view?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#0284C7', color: '#FFFFFF', padding: '18px 36px', borderRadius: '16px', textDecoration: 'none', fontWeight: 800, fontSize: '20px', display: 'inline-flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.3)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Get Android App
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '100px 20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '36px', fontWeight: 900, textAlign: 'center', marginBottom: '64px', color: '#0F172A', letterSpacing: '-1px' }}>Built for the Modern Community</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '40px', borderRadius: '24px', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>📱</div>
              <h4 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', color: '#0F172A' }}>Self Check-in QR</h4>
              <p style={{ color: '#64748B', lineHeight: 1.7, fontSize: '17px' }}>Visitors scan dynamic gate QR codes to quickly self-register, capturing their photo securely from their own device before arriving at the gate.</p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '40px', borderRadius: '24px', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🛠️</div>
              <h4 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', color: '#0F172A' }}>Resident Amenities</h4>
              <p style={{ color: '#64748B', lineHeight: 1.7, fontSize: '17px' }}>Residents can browse authorized society facilities and direct contacts for plumbers, electricians, and daily help, all dynamically managed by Admins.</p>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '40px', borderRadius: '24px', transition: 'transform 0.3s' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🛡️</div>
              <h4 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', color: '#0F172A' }}>Smart Guard Terminal</h4>
              <p style={{ color: '#64748B', lineHeight: 1.7, fontSize: '17px' }}>Guards use a highly intuitive mobile terminal to manage shifts, verify fast-pass codes, and track visitor logs without confusing interfaces.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="download" style={{ padding: '100px 20px', backgroundColor: '#0F172A', color: '#FFFFFF', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '24px', letterSpacing: '-1px' }}>Ready to secure your society?</h3>
          <p style={{ color: '#94A3B8', fontSize: '20px', marginBottom: '48px', lineHeight: 1.6 }}>
            Download the RM2 Secure app and create your society profile in minutes using our verified UP-RERA catalog integration.
          </p>
          <a href="https://drive.google.com/file/d/1hxaqqpm6tUORbI1P2AoHpcm4jMpt-54I/view?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#10B981', color: '#FFFFFF', padding: '20px 48px', borderRadius: '18px', textDecoration: 'none', fontWeight: 800, fontSize: '22px', display: 'inline-block', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
            Download APK for Android
          </a>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '24px' }}>Requires Android 10.0 or higher. Version 1.0.0</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 20px', backgroundColor: '#020617', textAlign: 'center', color: '#475569' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
          <a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
          <a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
          <a href="#" style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600 }}>Contact Support</a>
        </div>
        <p style={{ margin: 0, fontSize: '15px' }}>&copy; {new Date().getFullYear()} RM2 Secure. All rights reserved.</p>
      </footer>
    </div>
  );
}
