document.addEventListener('DOMContentLoaded', async () => {
  const admin = auth.requireAuth();
  if (!admin) return;

  // Set date
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

  await loadAnalytics();
});

async function loadAnalytics() {
  try {
    const res = await api.get('/super/analytics');
    const d = res.data;

    // Stats
    document.getElementById('statTotal').textContent    = d.stats.total;
    document.getElementById('statActive').textContent   = d.stats.active;
    document.getElementById('statNewWeek').textContent  = d.stats.new_this_week;
    document.getElementById('statInactive').textContent = d.stats.inactive;
    document.getElementById('statNewMonth').textContent = `+${d.stats.new_this_month} this month`;

    // Plan distribution
    renderPlanDist(d.plan_distribution);

    // Growth chart
    renderGrowthChart(d.monthly_growth);

    // Recent table
    renderRecentTable(d.recent_restaurants);

  } catch (err) {
    toast.error(err.message || 'Failed to load analytics');
  }
}

function renderPlanDist(plans) {
  const colors = { basic: '#6366f1', pro: '#8b5cf6', enterprise: '#10b981' };
  const total  = plans.reduce((s, p) => s + parseInt(p.count), 0) || 1;
  const el = document.getElementById('planDistCard');

  const bars = plans.map(p => {
    const pct = Math.round((parseInt(p.count) / total) * 100);
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${capitalize(p.plan)}</span>
          <span style="font-size:13px;color:var(--text-secondary)">${p.count} (${pct}%)</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${colors[p.plan]||'#6366f1'};border-radius:4px;transition:width 0.8s ease"></div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = bars || '<p style="color:var(--text-muted);font-size:13px">No data</p>';
}

function renderGrowthChart(growth) {
  const el  = document.getElementById('growthChart');
  if (!growth?.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No growth data</p>'; return; }
  const max = Math.max(...growth.map(g => parseInt(g.count))) || 1;
  el.innerHTML = growth.map(g => {
    const h = Math.max(4, Math.round((parseInt(g.count) / max) * 72));
    return `
      <div class="growth-bar-wrap">
        <div class="growth-bar-count">${g.count}</div>
        <div class="growth-bar" style="height:${h}px" title="${g.month}: ${g.count} restaurants"></div>
        <div class="growth-bar-label">${g.month?.split(' ')[0] || ''}</div>
      </div>`;
  }).join('');
}

function renderRecentTable(rows) {
  const tbody = document.getElementById('recentTableBody');
  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No restaurants yet — <a href="onboard.html">Onboard your first one</a></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text-primary)">${r.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${r.slug}</div>
      </td>
      <td>${r.city || '—'}</td>
      <td>${utils.planBadge(r.plan)}</td>
      <td>${utils.statusBadge(r.is_active)}</td>
      <td style="font-size:13px;color:var(--text-muted)">${utils.timeAgo(r.onboarded_at)}</td>
      <td><a href="restaurant-detail.html?id=${r.restaurant_id}" class="btn btn-secondary btn-sm">View →</a></td>
    </tr>`).join('');
}