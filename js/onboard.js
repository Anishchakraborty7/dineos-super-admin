document.addEventListener('DOMContentLoaded', () => {
  auth.requireAuth();
  setupForm();
});

function setupForm() {
  const form = document.getElementById('onboardForm');

  // Color previews
  ['primaryColor','secondaryColor'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('input', () => {
        const preview = document.getElementById(id + 'Preview');
        if (preview) preview.style.background = inp.value;
      });
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn  = document.getElementById('submitBtn');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="display:inline-block"></span> Onboarding...';
    hideResult();

    const payload = {
      name:            document.getElementById('name').value.trim(),
      owner_name:      document.getElementById('ownerName').value.trim(),
      owner_email:     document.getElementById('ownerEmail').value.trim(),
      owner_phone:     document.getElementById('ownerPhone').value.trim(),
      address:         document.getElementById('address').value.trim(),
      city:            document.getElementById('city').value.trim(),
      state:           document.getElementById('state').value.trim(),
      pincode:         document.getElementById('pincode').value.trim(),
      plan:            document.getElementById('plan').value,
      primary_color:   document.getElementById('primaryColor').value,
      secondary_color: document.getElementById('secondaryColor').value,
      tagline:         document.getElementById('tagline').value.trim(),
      notes:           document.getElementById('notes').value.trim(),
    };

    try {
      const res  = await api.post('/super/restaurants', payload);
      const data = res.data;
      showResult(data);
      form.reset();
      toast.success('Restaurant onboarded successfully!');
    } catch (err) {
      toast.error(err.message || 'Onboarding failed');
    } finally {
      btn.disabled  = false;
      btn.innerHTML = orig;
    }
  });
}

function showResult(data) {
  const container = document.getElementById('resultCard');
  const trialDate = data.trial_ends_at ? new Date(data.trial_ends_at).toLocaleDateString('en-IN') : '—';
  container.innerHTML = `
    <div class="card" style="border:2px solid var(--success);margin-top:32px">
      <div class="card-header">
        <div>
          <div class="card-title" style="color:var(--success)">✅ ${data.name} — Successfully Onboarded!</div>
          <div class="card-subtitle">Save these credentials now — they will NOT be shown again</div>
        </div>
        <a href="restaurant-detail.html?id=${data.restaurant_id}" class="btn btn-secondary btn-sm">View Details →</a>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="credential-box">
            <div class="cred-label">🔑 API Key (for mobile apps)</div>
            <div class="cred-value" id="apiKeyDisplay">${data.api_key}</div>
            <button class="btn btn-secondary btn-sm" onclick="copyVal('apiKeyDisplay', this)">📋 Copy API Key</button>
          </div>
          <div class="credential-box">
            <div class="cred-label">👤 Admin Login (for restaurant dashboard)</div>
            <div style="margin:8px 0">
              <span style="font-size:12px;color:var(--text-muted)">Email:</span>
              <div class="cred-value" id="emailDisplay">${data.admin_login?.email}</div>
            </div>
            <div style="margin:8px 0">
              <span style="font-size:12px;color:var(--text-muted)">Password:</span>
              <div class="cred-value" id="passDisplay">${data.admin_login?.password}</div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="copyCredentials('${data.admin_login?.email}', '${data.admin_login?.password}', this)">📋 Copy Credentials</button>
          </div>
        </div>
        <div style="margin-top:16px;padding:12px;background:rgba(245,158,11,0.1);border-radius:8px;border-left:3px solid #f59e0b">
          <strong>⚠️ Important:</strong> Trial ends ${trialDate}. Plan: <strong>${capitalize(data.plan)}</strong>.
          Share the API key with the app developer and the admin credentials with the restaurant owner.
        </div>
      </div>
    </div>`;
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideResult() {
  document.getElementById('resultCard').innerHTML = '';
}

async function copyVal(id, btn) {
  const val = document.getElementById(id)?.textContent;
  await utils.copyToClipboard(val, btn);
}

async function copyCredentials(email, password, btn) {
  await utils.copyToClipboard(`Email: ${email}\nPassword: ${password}`, btn);
  btn.innerHTML = '✓ Copied!';
  setTimeout(() => { btn.innerHTML = '📋 Copy Credentials'; }, 2000);
}
