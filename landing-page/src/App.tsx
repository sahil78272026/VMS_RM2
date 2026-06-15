import React, { useState, useEffect, useRef } from 'react';

const API_BASE = '/api/v1';

export default function App() {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ 
    visitor_name:'', visitor_phone:'', flat_id:'', entry_mode:'foot', 
    stay_duration:'1_2hr', purpose:'Guest', vehicle_number:'', photo_base64:'' 
  });
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getFlatStyle = (flatNumber: string) => {
    if (flatNumber.endsWith('A')) return { backgroundColor: '#1e3a8a', color: '#93c5fd' }; // Dark Blue bg, Light Blue text
    if (flatNumber.endsWith('B')) return { backgroundColor: '#14532d', color: '#86efac' }; // Dark Green bg, Light Green text
    return { backgroundColor: 'var(--bg-secondary)', color: 'white' }; // Default
  };

  const set = (k: string) => (v: string) => setForm(p => ({...p, [k]: v}));

  useEffect(() => {
    fetch(`${API_BASE}/flats?per_page=200`)
      .then(r => r.json())
      .then(d => setFlats(d.data?.items || d.data || []))
      .catch(console.error);
  }, []);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setError('Camera access denied. Please grant permission in browser settings.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.translate(canvasRef.current.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        set('photo_base64')(canvasRef.current.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.photo_base64) {
      setError('Please provide a photo');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/visitor-logs/self-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Check-in failed');
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="container min-h-screen flex center">
        <div className="glass card text-center animate-fade-in" style={{ width: '100%', maxWidth: 400 }}>
          <div className="success-icon">✓</div>
          <h2 style={{ marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>The resident has been notified. Please wait at the gate.</p>
          <button className="btn btn-primary w-full" onClick={() => { setStep('form'); setForm({ visitor_name:'', visitor_phone:'', flat_id:'', entry_mode:'foot', stay_duration:'1_2hr', purpose:'Guest', vehicle_number:'', photo_base64:'' }); }}>
            New Check-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container min-h-screen flex center">
      <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: 440, margin: '2rem 0' }}>
        
        {showCamera && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline autoPlay style={{ width: '100%', maxWidth: '400px', borderRadius: 16, marginBottom: 24, transform: 'scaleX(-1)', objectFit: 'cover' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: 16 }}>
              <button type="button" onClick={stopCamera} className="btn" style={{ backgroundColor: '#333', color: 'white' }}>Cancel</button>
              <button type="button" onClick={capturePhoto} className="btn btn-primary" style={{ padding: '1rem 2rem', borderRadius: 30, fontSize: 18 }}>📸 Capture Selfie</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>RM2 Residency</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visitor Self Check-In</p>
        </div>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group" style={{ textAlign: 'center' }}>
            <label>Visitor Photo</label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {form.photo_base64 ? (
                <img src={form.photo_base64} alt="Visitor" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
              ) : (
                <div style={{ width: 120, height: 120, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  📷
                </div>
              )}
              <button type="button" onClick={startCamera} className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                {form.photo_base64 ? 'Retake Selfie' : 'Take Selfie'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Your Name</label>
            <input required placeholder="Full Name" value={form.visitor_name} onChange={e => set('visitor_name')(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input required type="tel" placeholder="Mobile Number" value={form.visitor_phone} onChange={e => set('visitor_phone')(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Flat to Visit</label>
            <select required value={form.flat_id} onChange={e => set('flat_id')(e.target.value)}>
              <option value="" disabled>Select Flat...</option>
              {flats.map(f => <option key={f.id} value={f.id} style={getFlatStyle(f.flat_number)}>Flat {f.flat_number}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Purpose</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Guest','Delivery','Service','Interview'].map(p => (
                <button key={p} type="button" onClick={() => set('purpose')(p)} className={`btn-pill ${form.purpose === p ? 'active' : ''}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Arriving by?</label>
            <select value={form.entry_mode} onChange={e => set('entry_mode')(e.target.value)}>
              <option value="foot">On Foot</option>
              <option value="two_wheeler">Two Wheeler</option>
              <option value="four_wheeler">Four Wheeler (Car)</option>
            </select>
          </div>

          {form.entry_mode !== 'foot' && (
            <div className="form-group">
              <label>Vehicle Number (Optional)</label>
              <input placeholder="e.g. KA01AB1234" value={form.vehicle_number} onChange={e => set('vehicle_number')(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label>Expected Stay Duration</label>
            <select value={form.stay_duration} onChange={e => set('stay_duration')(e.target.value)}>
              <option value="30min">Less than 30 mins</option>
              <option value="1_2hr">1-2 Hours</option>
              <option value="half_day">Half Day</option>
              <option value="full_day">Full Day</option>
              <option value="overnight">Overnight</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ marginTop: '1rem' }}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
