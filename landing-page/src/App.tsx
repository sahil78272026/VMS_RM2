import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

import ProductLandingPage from './ProductLandingPage';

const MultiSearchableSelect = ({ options, value = [], onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedSearch = search.toLowerCase().replace(/[^a-z0-9]/g, '');
  const filtered = options.filter((o: any) => o.label.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedSearch));
  const selectedLabels = value.map((v: string) => options.find((o: any) => o.value === v)?.label).filter(Boolean);

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v: string) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          backgroundColor: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', 
          padding: '12px 16px', fontSize: '15px', color: value.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
          {value.length > 0 ? selectedLabels.join(', ') : placeholder}
        </div>
        <span>▼</span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
          backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
            <input 
              autoFocus
              placeholder="Search flats..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', backgroundColor: 'var(--input-bg)' }}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.map((o: any) => {
              const isSelected = value.includes(o.value);
              return (
                <div 
                  key={o.value}
                  onClick={() => toggleOption(o.value)}
                  style={{ 
                    padding: '12px 16px', cursor: 'pointer', fontSize: '15px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    ...o.style
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    readOnly
                    style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer', pointerEvents: 'none' }}
                  />
                  <span>{o.label}</span>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>No results found</div>}
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button type="button" onClick={() => setIsOpen(false)} className="btn btn-primary w-full" style={{ padding: '8px' }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialSocietyId = params.get('society_id');
  const initialGateId = params.get('gate_id');

  const [step, setStep] = useState('form');
  const [societyId] = useState<string | null>(initialSocietyId);
  const [gateId] = useState<string | null>(initialGateId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [societyDetails, setSocietyDetails] = useState<any>(null);
  
  const [form, setForm] = useState<{
    visitor_name: string; visitor_phone: string; flat_ids: string[]; entry_mode: string;
    stay_duration: string; purpose: string; vehicle_number: string; photo_base64: string; visitor_count: string;
  }>({ 
    visitor_name:'', visitor_phone:'', flat_ids:[], entry_mode:'foot', 
    stay_duration:'1_2hr', purpose:'Guest', vehicle_number:'', photo_base64:'', visitor_count: '1'
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getFlatStyle = (flatNumber: string) => {
    if (flatNumber.endsWith('A')) return { backgroundColor: '#E0F2FE', color: '#0284C7' }; // Light Blue bg, Blue text
    if (flatNumber.endsWith('B')) return { backgroundColor: '#DCFCE7', color: '#10B981' }; // Light Green bg, Green text
    return { backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }; // Default
  };

  const set = (k: string) => (v: string) => setForm(p => ({...p, [k]: v}));


  useEffect(() => {
    if (!societyId) return;
    fetch(`${API_BASE}/societies/${societyId}`)
      .then(r => r.json())
      .then(d => setSocietyDetails(d.data || d))
      .catch(console.error);
  }, [societyId]);

  useEffect(() => {
    if (form.visitor_phone && form.visitor_phone.length === 10) {
      fetch(`${API_BASE}/visitors/lookup/${form.visitor_phone}`)
        .then(r => r.json())
        .then(d => {
          const visitor = d.data;
          if (visitor && !form.visitor_name) {
            setForm(p => ({ 
              ...p, 
              visitor_name: visitor.name,
              vehicle_number: visitor.vehicle_number || p.vehicle_number,
              entry_mode: visitor.entry_mode || p.entry_mode
            }));
          }
        })
        .catch(() => {});
    }
  }, [form.visitor_phone]);

  useEffect(() => {
    if (!societyId) return;
    fetch(`${API_BASE}/flats?per_page=5000&society_id=${societyId}`)
      .then(r => r.json())
      .then(d => {
        const items = d.data?.items || d.data || [];
        items.sort((a: any, b: any) => a.flat_number.replace(/\d+/g, (n: any) => n.padStart(5, '0')).localeCompare(b.flat_number.replace(/\d+/g, (n: any) => n.padStart(5, '0'))));
        setFlats(items);
      })
      .catch(console.error);
  }, [societyId]);

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
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(form.visitor_phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/visitor-logs/self-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, society_id: Number(societyId), gate_id: gateId ? Number(gateId) : undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Check-in failed');
      setStep('done');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!societyId) {
    return <ProductLandingPage />;
  }

  if (step === 'done') {
    return (
      <div className="container min-h-screen flex center">
        <div className="card text-center animate-fade-in" style={{ width: '100%', maxWidth: 400 }}>
          <div className="success-icon">✓</div>
          <h2 style={{ marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>The resident has been notified. Please wait at the gate.</p>
          <button className="btn btn-primary w-full" onClick={() => { setStep('form'); setForm({ visitor_name:'', visitor_phone:'', flat_ids:[], entry_mode:'foot', stay_duration:'1_2hr', purpose:'Guest', vehicle_number:'', photo_base64:'', visitor_count: '1' }); }}>
            New Check-In
          </button>
        </div>
      </div>
    );
  }



  return (
    <>
      {showCamera && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          <div style={{ position: 'relative', width: '300px', height: '400px', borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', backgroundColor: '#111' }}>
            <video ref={videoRef} playsInline autoPlay style={{ width: '100%', height: '100%', transform: 'scaleX(-1)', objectFit: 'cover' }} />
            
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', border: '40px solid rgba(0,0,0,0.6)', borderRadius: '20px' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '260px', border: '2px dashed rgba(255,255,255,0.7)', borderRadius: '120px', pointerEvents: 'none' }}></div>
            
            <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, textAlign: 'center', color: 'white', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              Position face inside the frame
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 16 }}>
            <button type="button" onClick={stopCamera} className="btn" style={{ backgroundColor: '#333', color: 'white', padding: '1rem 2rem', borderRadius: 30, fontSize: 16 }}>Cancel</button>
            <button type="button" onClick={capturePhoto} className="btn btn-primary" style={{ padding: '1rem 2rem', borderRadius: 30, fontSize: 18, boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)' }}>📸 Capture Selfie</button>
          </div>
        </div>
      )}

      <div className="container min-h-screen flex center">
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 440, margin: '2rem 0' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, backgroundColor: 'white',
            border: '1.5px solid var(--accent)', margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}>
            <span style={{ fontSize: 32 }}>🏢</span>
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{societyDetails?.name || 'Loading Society...'}</h1>
          {societyDetails?.city && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{societyDetails.city}</p>}
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontWeight: 600 }}>Visitor Self Check-In</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label>Phone Number *</label>
            <input required type="tel" maxLength={10} placeholder="10-digit Mobile Number" value={form.visitor_phone} onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              set('visitor_phone')(val);
            }} />
            {error === 'Please enter a valid 10-digit mobile number' && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: 500 }}>{error}</div>
            )}
          </div>

          {form.visitor_phone && form.visitor_phone.length === 10 && (
            <>
              <div className="form-group" style={{ textAlign: 'center' }}>
                <label>Visitor Selfie *</label>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {form.photo_base64 ? (
                    <img src={form.photo_base64} alt="Visitor" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }} />
                  ) : (
                    <div style={{ width: 120, height: 120, borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      📷
                    </div>
                  )}
                  <button type="button" onClick={startCamera} className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-block' }}>
                    {form.photo_base64 ? 'Retake Selfie' : 'Take Selfie'}
                  </button>
                </div>
                {error === 'Please provide a photo' && (
                  <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8, fontWeight: 500 }}>{error}</div>
                )}
              </div>

              {form.photo_base64 && (
                <>
                  <div className="form-group">
                    <label>Flats to Visit *</label>
                    <MultiSearchableSelect 
                      value={form.flat_ids} 
                      onChange={(v: string[]) => setForm(p => ({ ...p, flat_ids: v }))}
                      options={flats.map(f => ({ value: f.id.toString(), label: `Flat ${f.flat_number}`, style: getFlatStyle(f.flat_number) }))}
                      placeholder="Select Flats..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Your Name *</label>
                    <input required placeholder="Full Name" value={form.visitor_name} onChange={e => set('visitor_name')(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Number of People</label>
                    <select required value={form.visitor_count} onChange={e => set('visitor_count')(e.target.value)}>
                      <option value="1">1 Person (Just me)</option>
                      <option value="2">2 People</option>
                      <option value="3">3 People</option>
                      <option value="4">4 People</option>
                      <option value="5">5+ People</option>
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
                </>
              )}
            </>
          )}

          {error && error !== 'Please enter a valid 10-digit mobile number' && error !== 'Please provide a photo' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginTop: '16px', fontSize: 14, textAlign: 'center', fontWeight: '500' }}>{error}</div>
          )}

          {form.visitor_phone && form.visitor_phone.length === 10 && form.photo_base64 && (
            <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ marginTop: '1rem' }}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </form>
      </div>
    </div>
    </>
  );
}
