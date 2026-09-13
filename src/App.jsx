// src/App.jsx
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import './styles.css'
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy 
} from 'firebase/firestore';
import { 
  Droplet, UserPlus, CheckCircle2, AlertTriangle, 
  SkipForward, History, ShieldCheck, LogOut, Trash2, Clock, Settings, Key 
} from 'lucide-react';

export default function App() {
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Auth & Admin Credentials State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [adminCreds, setAdminCreds] = useState({ username: 'pehesaratech', password: 'Pehesara@1977' });
  const [loginInput, setLoginInput] = useState({ username: '', password: '' });
  const [newCreds, setNewCreds] = useState({ username: '', password: '' });
  
  // App Logic States
  const [newName, setNewName] = useState('');
  const [waterAlert, setWaterAlert] = useState(false);
  const [skippedIds, setSkippedIds] = useState([]);
  const [activeTab, setActiveTab] = useState('water');
  const [loading, setLoading] = useState(true);

  // Firestore Real-time Listeners
  useEffect(() => {
    const qMembers = query(collection(db, 'water_members'));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qLogs = query(collection(db, 'water_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qPending = query(collection(db, 'water_pending'), orderBy('timestamp', 'desc'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPendingRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAdmin = onSnapshot(doc(db, 'settings', 'admin_config'), (docSnap) => {
      if (docSnap.exists()) {
        setAdminCreds(docSnap.data());
      } else {
        setDoc(doc(db, 'settings', 'admin_config'), { username: 'pehesaratech', password: 'Pehesara@1977' });
      }
    });

    return () => {
      unsubMembers();
      unsubLogs();
      unsubPending();
      unsubAdmin();
    };
  }, []);

  // Admin Login Handle
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginInput.username === adminCreds.username && loginInput.password === adminCreds.password) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginInput({ username: '', password: '' });
    } else {
      alert('වැරදි Username හෝ Password එකක්!');
    }
  };

  // Update Admin Credentials Handle
  const handleUpdateCreds = async (e) => {
    e.preventDefault();
    if (!newCreds.username.trim() || !newCreds.password.trim()) {
      alert('Username සහ Password හිස්ව තබන්න බෑ!');
      return;
    }

    await setDoc(doc(db, 'settings', 'admin_config'), {
      username: newCreds.username.trim(),
      password: newCreds.password.trim()
    });

    alert('Admin Username සහ Password සාර්ථකව වෙනස් විය!');
    setShowSettingsModal(false);
    setNewCreds({ username: '', password: '' });
  };

  // Algorithm for Next Duty
  const getNextPerson = () => {
    const availableMembers = members.filter(m => !skippedIds.includes(m.id));
    if (availableMembers.length === 0) return null;
    
    return [...availableMembers].sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      const dateA = a.lastUpdated ? a.lastUpdated.toDate() : new Date(0);
      const dateB = b.lastUpdated ? b.lastUpdated.toDate() : new Date(0);
      return dateA - dateB;
    })[0];
  };

  const nextPerson = getNextPerson();

  // Admin Action: Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addDoc(collection(db, 'water_members'), {
      name: newName.trim(),
      count: 0,
      lastUpdated: serverTimestamp()
    });
    setNewName('');
  };

  // User Action: Submit Request
  const handleUserSubmitRequest = async (member) => {
    await addDoc(collection(db, 'water_pending'), {
      memberId: member.id,
      memberName: member.name,
      timestamp: serverTimestamp()
    });
    alert(`ස්තූතියි ${member.name}! Admin approve කළ පසු Count එක එකතු වේවි.`);
  };

  // Admin Action: Approve Pending Request
  const handleApproveRequest = async (pendingItem) => {
    const member = members.find(m => m.id === pendingItem.memberId);
    if (member) {
      const memberRef = doc(db, 'water_members', member.id);
      await updateDoc(memberRef, {
        count: member.count + 1,
        lastUpdated: serverTimestamp()
      });

      await addDoc(collection(db, 'water_logs'), {
        memberName: member.name,
        timestamp: serverTimestamp()
      });
    }

    await deleteDoc(doc(db, 'water_pending', pendingItem.id));
    setWaterAlert(false);
  };

  // Admin Action: Reject Pending Request
  const handleRejectRequest = async (pendingId) => {
    await deleteDoc(doc(db, 'water_pending', pendingId));
  };

  // Admin Direct Tick
  const handleAdminDirectAdd = async (member) => {
    const memberRef = doc(db, 'water_members', member.id);
    await updateDoc(memberRef, {
      count: member.count + 1,
      lastUpdated: serverTimestamp()
    });
    await addDoc(collection(db, 'water_logs'), {
      memberName: member.name,
      timestamp: serverTimestamp()
    });
  };

  // Admin Action: Delete History Log
  const handleDeleteLog = async (logId) => {
    if (confirm('මෙම Record එක මකා දැමීමට සුරක්ෂිතද?')) {
      await deleteDoc(doc(db, 'water_logs', logId));
    }
  };

  if (loading) return <div style={styles.center}><Droplet size={40} color="#0284c7" /><p>Loading Data...</p></div>;

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <header style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Droplet size={26} color="#0284c7" />
          <h1 style={styles.title}>Water Tracker</h1>
        </div>

        {isAdmin ? (
          <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
            <button 
              style={styles.settingsBtn} 
              onClick={() => {
                setNewCreds({ username: adminCreds.username, password: adminCreds.password });
                setShowSettingsModal(true);
              }}
              title="Admin Settings"
            >
              <Settings size={16} color="#ffffff" />
            </button>
            <button style={styles.adminBadgeActive} onClick={() => setIsAdmin(false)}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <button style={styles.adminBadge} onClick={() => setShowLoginModal(true)}>
            <ShieldCheck size={14} color="#ffffff" /> Admin Login
          </button>
        )}
      </header>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        <button style={activeTab === 'water' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('water')}>🚰 Duty Tracker</button>
        <button style={activeTab === 'history' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('history')}>
          📜 History {pendingRequests.length > 0 && `(${pendingRequests.length})`}
        </button>
      </div>

      {/* TAB 1: WATER DUTY */}
      {activeTab === 'water' && (
        <>
          {/* Admin Pending Approvals Box */}
          {isAdmin && pendingRequests.length > 0 && (
            <div style={styles.pendingBox}>
              <h4 style={{margin: '0 0 10px 0', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '5px'}}>
                <Clock size={16} /> Pending Approvals ({pendingRequests.length})
              </h4>
              {pendingRequests.map(req => (
                <div key={req.id} style={styles.pendingRow}>
                  <span><strong>{req.memberName}</strong> brought water</span>
                  <div style={{display: 'flex', gap: '5px'}}>
                    <button style={styles.approveBtn} onClick={() => handleApproveRequest(req)}>Approve</button>
                    <button style={styles.rejectBtn} onClick={() => handleRejectRequest(req.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Water Empty Alert */}
          {waterAlert && (
            <div style={styles.alertBanner}>
              <AlertTriangle size={24} color="#dc2626" />
              <div>
                <strong>WATER IS EMPTY!</strong>
                <p style={{margin: 0, fontSize: '12px'}}>Attention needed immediately.</p>
              </div>
            </div>
          )}

          {/* Next Up Display Card */}
          {nextPerson ? (
            <div style={styles.nextCard}>
              <span style={styles.badge}>NEXT UP FOR WATER</span>
              <h2 style={styles.nextName}>{nextPerson.name}</h2>
              <p style={styles.nextSub}>Total Brought: {nextPerson.count} times</p>
              
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap'}}>
                <button style={styles.doneBtn} onClick={() => handleUserSubmitRequest(nextPerson)}>
                  <CheckCircle2 size={18} /> I Brought Water
                </button>
                <button style={styles.skipBtn} onClick={() => setSkippedIds([...skippedIds, nextPerson.id])}>
                  <SkipForward size={18} /> Skip (Not Home)
                </button>
              </div>
            </div>
          ) : (
            <p style={{textAlign: 'center', color: '#64748b'}}>All members skipped. <button onClick={() => setSkippedIds([])} style={styles.linkBtn}>Reset Skips</button></p>
          )}

          <button style={styles.alertTriggerBtn} onClick={() => setWaterAlert(!waterAlert)}>
            <AlertTriangle size={18} /> {waterAlert ? 'Clear Water Alert' : 'Report Water Empty!'}
          </button>

          {/* ADMIN ONLY: Add Member */}
          {isAdmin && (
            <form onSubmit={handleAddMember} style={styles.form}>
              <input 
                type="text" 
                placeholder="Admin: Add new member..." 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                style={styles.input} 
              />
              <button type="submit" style={styles.addBtn}><UserPlus size={16} /> Add</button>
            </form>
          )}

          {/* Leaderboard View */}
          <div style={styles.card}>
            <h3 style={{margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b'}}>Water Duty Status</h3>
            {members.sort((a,b) => b.count - a.count).map(m => (
              <div key={m.id} style={styles.row}>
                <div>
                  <strong style={{color: '#0f172a'}}>{m.name}</strong> {skippedIds.includes(m.id) && <span style={{color: '#ea580c', fontSize: '11px', fontWeight: 'bold'}}>(Skipped)</span>}
                  <div style={{fontSize: '12px', color: '#64748b', marginTop: '2px'}}>Ticks: {'✔️ '.repeat(m.count)} ({m.count})</div>
                </div>
                
                {isAdmin ? (
                  <button style={styles.smallBtn} onClick={() => handleAdminDirectAdd(m)}>+1 (Direct)</button>
                ) : (
                  <button style={styles.smallBtnUser} onClick={() => handleUserSubmitRequest(m)}>Report Done</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB 2: HISTORY LOGS */}
      {activeTab === 'history' && (
        <div style={styles.card}>
          <h3 style={{margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px'}}>
            <History size={18} color="#0284c7" /> Approved Activity Logs
          </h3>
          {logs.length === 0 ? <p style={{color: '#64748b'}}>No logs recorded yet.</p> : logs.map(l => (
            <div key={l.id} style={styles.logRow}>
              <div>
                <span>💧 <strong>{l.memberName}</strong> brought water</span>
                <div style={{fontSize: '11px', color: '#94a3b8', marginTop: '2px'}}>
                  {l.timestamp ? new Date(l.timestamp.toDate()).toLocaleString() : 'Just now'}
                </div>
              </div>
              {isAdmin && (
                <button style={styles.deleteBtn} onClick={() => handleDeleteLog(l.id)}>
                  <Trash2 size={16} color="#dc2626" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADMIN LOGIN */}
      {showLoginModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{marginTop: 0, color: '#0f172a'}}>Admin Login</h3>
            <form onSubmit={handleAdminLogin}>
              <input 
                type="text" 
                placeholder="Username" 
                value={loginInput.username}
                onChange={e => setLoginInput({...loginInput, username: e.target.value})}
                style={{...styles.input, width: '100%', marginBottom: '10px'}}
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={loginInput.password}
                onChange={e => setLoginInput({...loginInput, password: e.target.value})}
                style={{...styles.input, width: '100%', marginBottom: '15px'}}
              />
              <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowLoginModal(false)}>Cancel</button>
                <button type="submit" style={styles.addBtn}>Login</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE ADMIN CREDENTIALS */}
      {showSettingsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{marginTop: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Key size={18} color="#0284c7" /> Change Admin Credentials
            </h3>
            <form onSubmit={handleUpdateCreds}>
              <label style={styles.label}>New Username:</label>
              <input 
                type="text" 
                value={newCreds.username}
                onChange={e => setNewCreds({...newCreds, username: e.target.value})}
                style={{...styles.input, width: '100%', marginBottom: '10px'}}
              />
              <label style={styles.label}>New Password:</label>
              <input 
                type="text" 
                value={newCreds.password}
                onChange={e => setNewCreds({...newCreds, password: e.target.value})}
                style={{...styles.input, width: '100%', marginBottom: '15px'}}
              />
              <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowSettingsModal(false)}>Cancel</button>
                <button type="submit" style={styles.addBtn}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Fixed Clean Styling System
const styles = {
  container: { maxWidth: '420px', width:'100%',margin: '0 auto', padding: '15px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' },
  title: { fontSize: '20px', margin: 0, color: '#0284c7', fontWeight: 'bold' },
  adminBadge: { border: 'none', backgroundColor: '#0284c7', color: '#ffffff', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' },
  adminBadgeActive: { backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' },
  settingsBtn: { backgroundColor: '#0284c7', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tabContainer: { display: 'flex', gap: '5px', marginBottom: '15px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' },
  tab: { flex: 1, padding: '8px', color: '#64748b', border: 'none', borderRadius: '8px', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
  activeTab: { flex: 1, padding: '8px', color: '#0f172a', border: 'none', borderRadius: '8px', backgroundColor: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  nextCard: { backgroundColor: '#e0f2fe', border: '2px solid #0284c7', borderRadius: '14px', padding: '16px', textAlign: 'center', marginBottom: '15px' },
  badge: { backgroundColor: '#0284c7', color: '#ffffff', fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' },
  nextName: { fontSize: '26px', color: '#0369a1', margin: '8px 0 2px 0' },
  nextSub: { color: '#0284c7', fontSize: '13px', marginBottom: '12px' },
  doneBtn: { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' },
  skipBtn: { backgroundColor: '#ea580c', color: '#ffffff', border: 'none', padding: '10px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' },
  alertBanner: { backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#991b1b' },
  alertTriggerBtn: { width: '100%', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' },
  form: { display: 'flex', gap: '6px', marginBottom: '15px' },
  input: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px' },
  addBtn: { backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '13px' },
  cancelBtn: { backgroundColor: '#e2e8f0', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569' },
  card: { backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '15px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  logRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  smallBtn: { backgroundColor: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#0f172a', fontSize: '12px' },
  smallBtnUser: { backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  pendingBox: { backgroundColor: '#fef9c3', border: '1px solid #fde047', padding: '12px', borderRadius: '10px', marginBottom: '15px' },
  pendingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '13px' },
  approveBtn: { backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  rejectBtn: { backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  deleteBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' },
  label: { fontSize: '12px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 'bold' },
  linkBtn: { backgroundColor: 'transparent', border: 'none', color: '#0284c7', textDecoration: 'underline', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', width: '300px' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }
};