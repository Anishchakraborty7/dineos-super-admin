/**
 * DineOS Super Admin — Onboard Restaurant (Multi-Step Form)
 * Fixes: step navigation, slug auto-gen, color sync, brand preview, success modal
 */
document.addEventListener('DOMContentLoaded', () => {
  auth.requireAuth();
  initOnboard();
});

// ============================================================
// State
// ============================================================
let currentStep = 1;
const TOTAL_STEPS = 4;

// ============================================================
// Slug generator (mirrors backend logic)
// ============================================================
function toSlug(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphens
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');   // trim leading/trailing hyphens
}

// ============================================================
// Step Validation
// ============================================================
function validateStep(step) {
  const showError = (msg) => {
    const el = document.getElementById('stepError');
    const txt = document.getElementById('stepErrorText');
    if (el && txt) { txt.textContent = msg; el.style.display = 'flex'; }
    return false;
  };
  const hideError = () => {
    const el = document.getElementById('stepError');
    if (el) el.style.display = 'none';
  };

  hideError();

  if (step === 1) {
    const name = document.getElementById('name')?.value.trim();
    if (!name) return showError('Restaurant name is required.');
  }
  if (step === 2) {
    const email = document.getElementById('ownerEmail')?.value.trim();
    if (!email) return showError('Owner email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return showError('Please enter a valid email address.');
  }
  return true;
}

// ============================================================
// Step Navigation
// ============================================================
function goToStep(step) {
  // Update panels
  document.querySelectorAll('.step-panel').forEach((p, i) => {
    p.classList.toggle('active', i + 1 === step);
  });

  // Update stepper indicators
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const stepEl = document.getElementById(`step-${i}`);
    const lineEl = document.getElementById(`line-${i}`);
    if (stepEl) {
      stepEl.classList.toggle('active', i === step);
      stepEl.classList.toggle('done', i < step);
    }
    if (lineEl) {
      lineEl.classList.toggle('done', i < step);
    }
  }

  // Back button
  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.style.visibility = step > 1 ? 'visible' : 'hidden';

  // Next/Submit button label
  const nextBtnText = document.getElementById('nextBtnText');
  if (nextBtnText) {
    nextBtnText.textContent = step === TOTAL_STEPS ? '✅ Create Restaurant' : 'Next →';
  }

  // Hide step error when changing steps
  const errorEl = document.getElementById('stepError');
  if (errorEl) errorEl.style.display = 'none';

  currentStep = step;

  // Scroll to top of form
  document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// Brand Preview (Step 4)
// ============================================================
function updateBrandPreview() {
  const name    = document.getElementById('name')?.value.trim() || 'Restaurant Name';
  const tagline = document.getElementById('tagline')?.value.trim() || 'Your tagline here';
  const primary = document.getElementById('primaryColor')?.value || '#E63946';
  const secondary = document.getElementById('secondaryColor')?.value || '#1D3557';

  const previewName    = document.getElementById('previewName');
  const previewTagline = document.getElementById('previewTagline');
  const previewDot     = document.getElementById('previewDot');
  const previewHeader  = document.getElementById('previewHeader');
  const previewAccent  = document.getElementById('previewAccent');

  if (previewName)    previewName.textContent    = name;
  if (previewTagline) previewTagline.textContent = tagline;
  if (previewDot)     previewDot.style.background = primary;
  if (previewHeader)  previewHeader.style.background = secondary + '22';
  if (previewAccent)  previewAccent.style.background = primary;
}

// ============================================================
// Success Modal
// ============================================================
function showSuccessModal(data) {
  document.getElementById('successRestName').textContent = data.name || '—';
  document.getElementById('apiKeyDisplay').textContent   = data.api_key || '—';
  document.getElementById('successRestId').textContent   = data.restaurant_id || '—';
  document.getElementById('successPlan').innerHTML       = utils.planBadge(data.plan);
  document.getElementById('successSlug').textContent     = data.slug || '—';
  document.getElementById('successEmail').textContent    = data.admin_login?.email || '—';

  // Show admin password in modal too (add it dynamically if not in HTML)
  let passRow = document.getElementById('successPasswordRow');
  if (!passRow) {
    const grid = document.querySelector('#successModal .modal-body > div[style*="grid"]');
    if (grid) {
      passRow = document.createElement('div');
      passRow.id = 'successPasswordRow';
      passRow.innerHTML = `<span class="text-muted">Admin Password</span><br><strong id="successPassword" style="font-family:monospace;font-size:12px;color:var(--warning)">—</strong>`;
      grid.appendChild(passRow);
    }
  }
  const passEl = document.getElementById('successPassword');
  if (passEl) passEl.textContent = data.admin_login?.password || '—';

  // Set "View Restaurant" link
  const viewBtn = document.getElementById('viewDetailBtn');
  if (viewBtn) viewBtn.href = `restaurant-detail.html?id=${data.restaurant_id}`;

  // Show modal
  document.getElementById('successModal').classList.add('active');
}

// Global copy function (called from HTML onclick)
window.copyApiKey = async () => {
  const key = document.getElementById('apiKeyDisplay')?.textContent;
  const btn = document.getElementById('copyKeyBtn');
  if (key && key !== 'rk_live_...') {
    await utils.copyToClipboard(key, btn);
    toast.success('API key copied to clipboard!');
  }
};

// ============================================================
// Submit (Step 4)
// ============================================================
async function submitOnboard() {
  const nextBtn     = document.getElementById('nextBtn');
  const nextBtnText = document.getElementById('nextBtnText');
  const spinner     = document.getElementById('nextSpinner');
  const errorEl     = document.getElementById('stepError');
  const errorTxt    = document.getElementById('stepErrorText');

  nextBtn.disabled        = true;
  nextBtnText.textContent = 'Creating...';
  spinner.style.display   = 'inline-block';
  if (errorEl) errorEl.style.display = 'none';

  const payload = {
    name:            document.getElementById('name')?.value.trim(),
    owner_name:      document.getElementById('ownerName')?.value.trim(),
    owner_email:     document.getElementById('ownerEmail')?.value.trim(),
    owner_phone:     document.getElementById('ownerPhone')?.value.trim(),
    address:         document.getElementById('address')?.value.trim(),
    city:            document.getElementById('city')?.value.trim(),
    state:           document.getElementById('state')?.value.trim(),
    pincode:         document.getElementById('pincode')?.value.trim(),
    plan:            document.getElementById('plan')?.value || 'basic',
    primary_color:   document.getElementById('primaryColor')?.value || '#E63946',
    secondary_color: document.getElementById('secondaryColor')?.value || '#1D3557',
    tagline:         document.getElementById('tagline')?.value.trim(),
    notes:           document.getElementById('notes')?.value.trim(),
  };

  try {
    const res = await api.post('/super/restaurants', payload);
    const data = res.data || res;

    // Reset form + stepper
    document.querySelectorAll('input:not([type="color"]), textarea, select').forEach(el => {
      if (el.id === 'plan') el.value = 'basic';
      else if (el.id !== 'primaryColor' && el.id !== 'secondaryColor') el.value = '';
    });
    document.getElementById('primaryColor').value      = '#E63946';
    document.getElementById('primaryColorText').value  = '#E63946';
    document.getElementById('secondaryColor').value    = '#1D3557';
    document.getElementById('secondaryColorText').value = '#1D3557';
    document.getElementById('slugPreview').value       = '';
    updateBrandPreview();
    goToStep(1);

    // Show success modal
    showSuccessModal(data);
    toast.success(`🎉 ${data.name} onboarded successfully!`);

  } catch (err) {
    if (errorEl && errorTxt) {
      errorTxt.textContent = err.message || 'Failed to create restaurant. Try again.';
      errorEl.style.display = 'flex';
    }
    toast.error(err.message || 'Onboarding failed.');
  } finally {
    nextBtn.disabled        = false;
    nextBtnText.textContent = '✅ Create Restaurant';
    spinner.style.display   = 'none';
  }
}

// ============================================================
// Init
// ============================================================
function initOnboard() {

  // ---- Slug auto-generation ----
  const nameInput     = document.getElementById('name');
  const slugPreview   = document.getElementById('slugPreview');

  nameInput?.addEventListener('input', () => {
    const slug = toSlug(nameInput.value);
    if (slugPreview) slugPreview.value = slug;
    // Also update brand preview name live
    updateBrandPreview();
  });

  // ---- Color picker ↔ text sync ----
  const primaryColor     = document.getElementById('primaryColor');
  const primaryColorText = document.getElementById('primaryColorText');
  const secondaryColor     = document.getElementById('secondaryColor');
  const secondaryColorText = document.getElementById('secondaryColorText');

  primaryColor?.addEventListener('input', () => {
    if (primaryColorText) primaryColorText.value = primaryColor.value;
    updateBrandPreview();
  });
  primaryColorText?.addEventListener('input', () => {
    const v = primaryColorText.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      primaryColor.value = v;
      updateBrandPreview();
    }
  });

  secondaryColor?.addEventListener('input', () => {
    if (secondaryColorText) secondaryColorText.value = secondaryColor.value;
    updateBrandPreview();
  });
  secondaryColorText?.addEventListener('input', () => {
    const v = secondaryColorText.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      secondaryColor.value = v;
      updateBrandPreview();
    }
  });

  // ---- Tagline live preview ----
  document.getElementById('tagline')?.addEventListener('input', updateBrandPreview);

  // ---- Next button ----
  document.getElementById('nextBtn')?.addEventListener('click', async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
    } else {
      // Final step — submit
      await submitOnboard();
    }
  });

  // ---- Back button ----
  document.getElementById('backBtn')?.addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  // ---- Cancel button ----
  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    if (confirm('Cancel onboarding? All entered data will be lost.')) {
      window.location.href = 'restaurants.html';
    }
  });

  // ---- "Onboard Another" button in modal ----
  document.getElementById('onboardAnotherBtn')?.addEventListener('click', () => {
    document.getElementById('successModal')?.classList.remove('active');
  });

  // ---- Close modal on backdrop click ----
  document.getElementById('successModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('successModal')) {
      document.getElementById('successModal').classList.remove('active');
    }
  });

  // Initial state
  goToStep(1);
  updateBrandPreview();
}
