/**
 * DineOS Super Admin — Restaurant Detail Page
 */
document.addEventListener('DOMContentLoaded', async () => {

  const admin = auth.requireAuth();
  if (!admin) return;

  // Get restaurant ID from URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = 'restaurants.html'; return; }

  let restaurant = null;

  // ---- Load restaurant data ----
  async function load() {
    try {
      const res = await api.get(`/super/restaurants/${id}`);
      restaurant = res.data ? res.data : res;
      render(restaurant);
    } catch (err) {
      document.getElementById('loadingState').innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">❌</span>
          <div class="empty-title">Failed to load</div>
          <div class="empty-message">${err.message}</div>
          <a href="restaurants.html" class="btn btn-secondary btn-sm">← Back</a>
        </div>`;
    }
  }

  // ---- Render ----
  function render(r) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainDetail').style.display   = 'block';
    document.getElementById('pageTitle').textContent = r.name;

    // Hero
    const avatar = document.getElementById('detailAvatar');
    avatar.textContent = utils.initials(r.name);
    avatar.style.background = utils.avatarColor(r.name);
    document.getElementById('detailName').textContent          = r.name;
    document.getElementById('detailSlug').textContent          = `/${r.slug}`;
    document.getElementById('detailPlanBadge').innerHTML       = utils.planBadge(r.plan);
    document.getElementById('detailStatusBadge').innerHTML     = utils.statusBadge(r.is_active);
    document.getElementById('detailCity').textContent          = [r.city, r.state].filter(Boolean).join(', ') || '—';
    document.getElementById('detailJoined').textContent        = utils.formatDate(r.onboarded_at);

    // Owner
    document.getElementById('infoOwnerName').textContent   = r.owner_name  || '—';
    document.getElementById('infoOwnerEmail').textContent  = r.owner_email || '—';
    document.getElementById('infoOwnerPhone').textContent  = r.owner_phone || '—';

    // Location
    document.getElementById('infoAddress').textContent  = r.address || '—';
    document.getElementById('infoCityState').textContent =
      [r.city, r.state].filter(Boolean).join(', ') || '—';
    document.getElementById('infoPincode').textContent  = r.pincode || '—';

    // API key
    document.getElementById('apiKeyPreview').textContent = r.api_key_preview || '—';

    // Branding
    document.getElementById('primaryColorSwatch').style.background   = r.primary_color   || '#E63946';
    document.getElementById('secondaryColorSwatch').style.background = r.secondary_color || '#1D3557';
    document.getElementById('infoPrimaryColor').textContent   = r.primary_color   || '—';
    document.getElementById('infoSecondaryColor').textContent = r.secondary_color || '—';
    document.getElementById('infoFont').textContent           = r.font_family     || '—';
    document.getElementById('infoTagline').textContent        = r.tagline         || '—';
    document.getElementById('infoCustomDomain').textContent   = r.custom_domain   || 'Not set';
    document.getElementById('infoConfigUpdated').textContent  = utils.formatDate(r.config_updated_at);

    // Notes
    document.getElementById('infoNotes').value = r.notes || '';

    // Feature flags
    renderFeatures(r.features_enabled || {});

    // Status toggle button
    const toggleBtn = document.getElementById('toggleStatusBtn');
    toggleBtn.style.display = 'inline-flex';
    toggleBtn.textContent = r.is_active ? '⛔ Suspend' : '✅ Reactivate';
    toggleBtn.className = `btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-success'}`;
  }

  // ---- Feature Flags ----
  const FEATURE_LABELS = {
    online_ordering:   { label: '🛍️ Online Ordering',   desc: 'Customers can order online' },
    table_reservation: { label: '🪑 Table Reservation',  desc: 'Book tables in advance' },
    open_mic:          { label: '🎤 Open Mic / Events',  desc: 'Event registrations' },
    loyalty_program:   { label: '🏅 Loyalty Program',    desc: 'Points & rewards' },
    delivery:          { label: '🚚 Delivery',            desc: 'Delivery orders' },
    dine_in:           { label: '🍽️ Dine-In',            desc: 'Dine-in ordering' },
    qr_ordering:       { label: '📱 QR Ordering',         desc: 'Scan-to-order at table' },
  };

  function renderFeatures(features) {
    const grid = document.getElementById('featureGrid');
    grid.innerHTML = Object.entries(FEATURE_LABELS).map(([key, meta]) => {
      const enabled = !!features[key];
      return `
        <div class="feature-item">
          <span title="${meta.desc}">${meta.label}</span>
          <label class="toggle" title="${enabled ? 'Disable' : 'Enable'} ${meta.label}">
            <input type="checkbox" ${enabled ? 'checked' : ''} data-feature="${key}" />
            <div class="toggle-track"></div>
            <div class="toggle-thumb"></div>
          </label>
        </div>`;
    }).join('');

    // bind toggle events
    grid.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const feature = cb.dataset.feature;
        const newFeatures = { ...(restaurant.features_enabled || {}), [feature]: cb.checked };
        try {
          await api.post(`/super/restaurants/${id}/features`, {
          feature: feature,
          enabled: cb.checked
        });
          restaurant.features_enabled = newFeatures;
          toast.success(`${cb.checked ? 'Enabled' : 'Disabled'} ${FEATURE_LABELS[feature]?.label}`);
        } catch (err) {
          cb.checked = !cb.checked; // revert
          toast.error(err.message);
        }
      });
    });
  }

  // ---- Status Toggle ----
  document.getElementById('toggleStatusBtn').addEventListener('click', async () => {
    if (!restaurant) return;
    const action = restaurant.is_active ? 'suspend' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} "${restaurant.name}"?`)) return;
    try {
      await api.patch(`/super/restaurants/${id}`, { is_active: !restaurant.is_active });
      toast.success(`Restaurant ${action}d successfully.`);
      load(); // refresh
    } catch (err) {
      toast.error(err.message);
    }
  });

  // ---- Save Notes ----
  document.getElementById('saveNotesBtn').addEventListener('click', async () => {
    const notes = document.getElementById('infoNotes').value;
    try {
      await api.patch(`/super/restaurants/${id}`, { notes });
      toast.success('Notes saved.');
    } catch (err) {
      toast.error(err.message);
    }
  });

  // ---- Regenerate API Key ----
  document.getElementById('regenerateKeyBtn').addEventListener('click', () => {
    document.getElementById('regenReason').value = '';
    openModal('regenModal');
  });

  document.getElementById('regenConfirmBtn').addEventListener('click', async () => {
    const reason = document.getElementById('regenReason').value.trim();
    const btn = document.getElementById('regenConfirmBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try {
      const res = await api.post(`/super/restaurants/${id}/regenerate-key`, { reason });
      closeModal('regenModal');

      // Show new key modal
      const data = res.data ? res.data : res;
      document.getElementById('newKeyDisplay').textContent = data.api_key;
      openModal('newKeyModal');

      // Bind copy button
      document.getElementById('copyNewKeyBtn').onclick = async () => {
        await utils.copyToClipboard(res.data.api_key, document.getElementById('copyNewKeyBtn'));
        toast.success('New API key copied!');
      };

      // Refresh to update preview
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '♻️ Regenerate Now';
    }
  });

  // ---- Modal helpers ----
  window.openModal  = id => document.getElementById(id).classList.add('active');
  window.closeModal = id => document.getElementById(id).classList.remove('active');
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('active'); });
  });

  // Init
  load();
});

