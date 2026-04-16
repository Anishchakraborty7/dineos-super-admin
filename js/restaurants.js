let page = 1;
const limit = 15;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth();
  await loadRestaurants();

  document.getElementById('searchInput').addEventListener('input',
    utils.debounce(() => { page = 1; currentFilters.search = document.getElementById('searchInput').value.trim(); loadRestaurants(); }, 350)
  );
  document.getElementById('filterStatus').addEventListener('change', () => { page = 1; currentFilters.status = document.getElementById('filterStatus').value; loadRestaurants(); });
  document.getElementById('filterPlan').addEventListener('change',   () => { page = 1; currentFilters.plan = document.getElementById('filterPlan').value; loadRestaurants(); });
});

async function loadRestaurants() {
  const params = new URLSearchParams({ page, limit, ...currentFilters });
  try {
    const res  = await api.get(`/super/restaurants?${params}`);
    const { data, pagination } = res;
    renderTable(data);
    renderPagination(pagination);
    document.getElementById('totalCount').textContent = `${pagination.total} restaurants`;
  } catch (err) {
    toast.error(err.message || 'Failed to load restaurants');
  }
}

function renderTable(rows) {
  const tbody = document.getElementById('restaurantTableBody');
  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:48px">No restaurants found. <a href="onboard.html">Onboard your first one →</a></td></tr>`;
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
      <td>${utils.subStatusBadge(r.subscription_status || 'unknown')}</td>
      <td>${utils.statusBadge(r.is_active)}</td>
      <td>
        <div style="display:flex;gap:8px">
          <a href="restaurant-detail.html?id=${r.restaurant_id}" class="btn btn-secondary btn-sm">Manage</a>
          <button onclick="toggleActive('${r.restaurant_id}', ${r.is_active})" class="btn btn-sm ${r.is_active ? 'btn-danger' : 'btn-success'}">${r.is_active ? 'Suspend' : 'Activate'}</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderPagination(pagination) {
  const el = document.getElementById('pagination');
  if (!pagination || pagination.pages <= 1) { el.innerHTML = ''; return; }
  let html = `<div style="display:flex;gap:8px;align-items:center;justify-content:center;margin-top:24px">`;
  html += `<button class="btn btn-secondary btn-sm" onclick="changePage(${page-1})" ${page<=1?'disabled':''}>← Prev</button>`;
  html += `<span style="font-size:13px;color:var(--text-secondary)">Page ${pagination.page} of ${pagination.pages}</span>`;
  html += `<button class="btn btn-secondary btn-sm" onclick="changePage(${page+1})" ${page>=pagination.pages?'disabled':''}>Next →</button>`;
  html += `</div>`;
  el.innerHTML = html;
}

function changePage(newPage) { page = newPage; loadRestaurants(); }

async function toggleActive(id, isActive) {
  if (!confirm(`${isActive ? 'Suspend' : 'Activate'} this restaurant?`)) return;
  try {
    await api.patch(`/super/restaurants/${id}`, { is_active: !isActive });
    toast.success(`Restaurant ${isActive ? 'suspended' : 'activated'}.`);
    loadRestaurants();
  } catch (err) { toast.error(err.message); }
}
