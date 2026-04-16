let page = 1;
const limit = 15;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth();
  await loadRestaurants();

  document.getElementById('searchInput').addEventListener('input',
    utils.debounce(() => { page = 1; currentFilters.search = document.getElementById('searchInput').value.trim(); loadRestaurants(); }, 350)
  );
  document.getElementById('statusFilter').addEventListener('change', () => {
    page = 1; currentFilters.status = document.getElementById('statusFilter').value; loadRestaurants();
  });
  document.getElementById('planFilter').addEventListener('change', () => {
    page = 1; currentFilters.plan = document.getElementById('planFilter').value; loadRestaurants();
  });
  document.getElementById('prevBtn').addEventListener('click', () => { if (page > 1) { page--; loadRestaurants(); } });
  document.getElementById('nextBtn').addEventListener('click', () => { page++; loadRestaurants(); });
});

async function loadRestaurants() {
  const params = new URLSearchParams({ page, limit, ...currentFilters });
  try {
    const res = await api.get(`/super/restaurants?${params}`);
    const { data, pagination } = res;
    renderTable(data);
    renderPagination(pagination);
    const totalEl = document.getElementById('totalCount');
    if (totalEl) totalEl.textContent = `${pagination.total} restaurants`;
  } catch (err) {
    toast.error(err.message || 'Failed to load restaurants');
    const tbody = document.getElementById('tableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="empty-icon">❌</span><div class="empty-title">Error</div><div class="empty-message">${err.message}</div></div></td></tr>`;
  }
}

function renderTable(rows) {
  const tbody = document.getElementById('tableBody');
  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:48px">No restaurants yet. <a href="onboard.html">Onboard your first →</a></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:${utils.avatarColor(r.name)};display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:13px;flex-shrink:0">${utils.initials(r.name)}</div>
          <div>
            <div style="font-weight:600;color:var(--text-primary)">${r.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">@${r.slug}</div>
          </div>
        </div>
      </td>
      <td style="font-size:13px">${r.owner_email}</td>
      <td style="font-size:13px">${r.city || '—'}</td>
      <td>${utils.planBadge(r.plan)}</td>
      <td><code style="font-size:11px;color:var(--text-muted)">${r.api_key_preview || '—'}</code></td>
      <td>${utils.statusBadge(r.is_active)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${utils.formatDate(r.onboarded_at)}</td>
      <td>
        <div style="display:flex;gap:8px">
          <a href="restaurant-detail.html?id=${r.restaurant_id}" class="btn btn-secondary btn-sm">Manage</a>
          <button onclick="toggleActive(${r.restaurant_id}, ${r.is_active})" class="btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-success'}">${r.is_active ? 'Suspend' : 'Activate'}</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderPagination(pagination) {
  if (!pagination) return;
  const info = document.getElementById('pageInfo');
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');
  if (info) info.textContent = `Page ${pagination.page} of ${pagination.pages} (${pagination.total} total)`;
  if (prev) prev.disabled = page <= 1;
  if (next) next.disabled = page >= (pagination.pages || 1);
}

async function toggleActive(id, isActive) {
  if (!confirm(`${isActive ? 'Suspend' : 'Activate'} this restaurant?`)) return;
  try {
    await api.patch(`/super/restaurants/${id}`, { is_active: !isActive });
    toast.success(`Restaurant ${isActive ? 'suspended' : 'activated'}.`);
    loadRestaurants();
  } catch (err) { toast.error(err.message); }
}
