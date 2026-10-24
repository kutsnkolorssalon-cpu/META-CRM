const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// API: GET LEADS
app.get('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: ADD LEAD - NO DUPLICATE BY PHONE
app.post('/api/leads', async (req, res) => {
  try {
    let { name, phone, source, status, city } = req.body;
    phone = String(phone || "").trim().replace(/\s+/g,'');
    if (!phone) return res.json({ success: false, message: "Phone missing" });
    const { data: exists } = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
    if (exists && exists.length > 0) {
      return res.json({ success: true, duplicate: true, message: "Duplicate - skipped" });
    }
    const { data, error } = await supabase.from('leads').insert([{ 
      name: name || "New Lead", 
      phone, 
      source: source || "Master Sheet",
      status: status || "New",
      city: city || ""
    }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, duplicate: false, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// FRONTEND DASHBOARD
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meta CRM - KNK Awadh</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;margin:0;padding:15px}
.header{background:linear-gradient(135deg,#ff0055,#ff8a00);padding:20px;border-radius:16px;text-align:center;margin-bottom:15px}
.header h1{margin:0;font-size:24px}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px}
.stat{background:#1e1e1e;padding:15px;border-radius:12px;text-align:center;border:1px solid #333}
.stat b{font-size:22px;display:block;color:#ff0055}
.card{background:#1e1e1e;border-radius:16px;padding:15px;border:1px solid #333}
input,select,button{width:100%;padding:12px;margin:6px 0;border-radius:10px;border:1px solid #333;background:#2a2a2a;color:#fff;box-sizing:border-box}
button{background:linear-gradient(135deg,#ff0055,#ff8a00);border:0;font-weight:bold;cursor:pointer}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
th,td{padding:10px 6px;border-bottom:1px solid #333;text-align:left}
th{color:#888;font-size:11px;text-transform:uppercase}
.badge{padding:3px 8px;border-radius:20px;font-size:11px;background:#333}
.success{color:#00ff88}.dup{color:#ffaa00}
a{color:#fff;text-decoration:underline}
</style>
</head>
<body>
<div class="header">
<h1>🔥 Meta CRM LIVE!</h1>
<p>KNK Awadh - No Duplicate System ✅</p>
<p><a href="/api/leads">View Raw API: /api/leads</a></p>
</div>
<div class="stats">
<div class="stat"><b id="total">0</b>Total Leads</div>
<div class="stat"><b id="today">0</b>Today</div>
<div class="stat"><b style="color:#00ff88">ACTIVE</b>System</div>
</div>
<div class="card">
<h3 style="margin-top:0">➕ Add Lead (Test)</h3>
<input id="name" placeholder="Name e.g. Amit Verma">
<input id="phone" placeholder="Phone e.g. 9999999999">
<input id="city" placeholder="City e.g. Lucknow">
<select id="source"><option>Master Sheet</option><option>Facebook Ads</option><option>Instagram</option><option>Website</option></select>
<button onclick="addLead()">Add Lead - Auto Duplicate Check</button>
<p id="msg"></p>
</div>
<div class="card" style="margin-top:15px">
<h3 style="margin-top:0">📋 Latest Leads (Auto-refresh)</h3>
<div style="overflow:auto;max-height:60vh">
<table><thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Time</th></tr></thead><tbody id="leads"></tbody></table>
</div>
</div>
<script>
async function load(){
  try{
    const res=await fetch('/api/leads');const data=await res.json();
    document.getElementById('total').innerText=data.length;
    const today=data.filter(d=>new Date(d.created_at).toDateString()===new Date().toDateString()).length;
    document.getElementById('today').innerText=today;
    const rows=data.map(l=>\`<tr><td>\${l.name||'-'}</td><td>\${l.phone||'-'}</td><td><span class="badge">\${l.source||'-'}</span></td><td>\${new Date(l.created_at).toLocaleString('en-IN')}</td></tr>\`).join('');
    document.getElementById('leads').innerHTML=rows||'<tr><td colspan=4 style="text-align:center;opacity:0.5">No leads yet - Add from Master Sheet</td></tr>';
  }catch(e){}
}
async function addLead(){
  const name=document.getElementById('name').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const city=document.getElementById('city').value.trim();
  const source=document.getElementById('source').value;
  if(!phone){alert('Enter phone');return;}
  document.getElementById('msg').innerText='Adding...';
  const res=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,source,city})});
  const j=await res.json();
  if(j.duplicate){document.getElementById('msg').innerHTML='<span class=dup>⚠️ Duplicate - Already exists! Skipped</span>';}
  else if(j.success){document.getElementById('msg').innerHTML='<span class=success>✅ Lead Added!</span>';document.getElementById('phone').value='';load();}
  else{document.getElementById('msg').innerText='Error: '+(j.error||j.message);}
}
load();setInterval(load,5000);
</script>
</body>
</html>
  `);
});

module.exports = app;
