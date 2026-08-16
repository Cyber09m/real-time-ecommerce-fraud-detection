import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import "./style.css";

const API="http://localhost:3000";

function App(){
  const [user,setUser]=useState("u1"),[state,setState]=useState(null),[audit,setAudit]=useState([]),[error,setError]=useState("");

  async function load(){
    setError("");
    try{
      const s=await fetch(`${API}/users/${user}/state`);
      if(!s.ok) throw new Error("No state found");
      setState(await s.json());
      const a=await fetch(`${API}/users/${user}/audit`);
      setAudit(await a.json());
    }catch(e){setError(e.message);setState(null);setAudit([]);}
  }

  return <main>
    <header><div><p className="eyebrow">REAL-TIME FRAUD ENGINE</p><h1>Fraud Risk Dashboard</h1></div></header>
    <div className="search"><input value={user} onChange={e=>setUser(e.target.value)} placeholder="user id"/><button onClick={load}>Load User</button></div>
    {error&&<div className="error">{error}</div>}
    {state&&<div className="grid">
      <div className="card"><span>Risk level</span><strong>{state.risk_level}</strong></div>
      <div className="card"><span>Risk score</span><strong>{state.fraud_risk_score}</strong></div>
      <div className="card"><span>Transactions</span><strong>{state.transaction_count}</strong></div>
    </div>}
    <section className="card audit"><h2>Audit trail</h2>
      {audit.length===0?<p>No audit records.</p>:audit.map((x,i)=><article key={i}><b>{x.decision}</b><p>{x.decision_reason}</p><small>{x.decision_timestamp}</small></article>)}
    </section>
  </main>
}
createRoot(document.getElementById("root")).render(<App/>);
