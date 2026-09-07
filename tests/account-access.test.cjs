const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual route handlers and password/session code with an isolated
// database. The mail boundary is stubbed so tests never contact members.
const tables = { users: [], sessions: [], subscriptions: [] };
let failSubscriptions = false;
const db = {
  from(table) {
    let filters = [], action = 'read', payload, single = false, columns = '*';
    const query = {
      select(value = '*') { columns = value; return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      gt(key, value) { filters.push(row => row[key] > value); return query; },
      order() { return query; },
      insert(value) { action = 'insert'; payload = value; return query; },
      update(value) { action = 'update'; payload = value; return query; },
      delete() { action = 'delete'; return query; },
      single() { single = true; return query; },
      maybeSingle() { single = true; return query; },
      then(resolve, reject) {
        if (table === 'subscriptions' && failSubscriptions) {
          return Promise.resolve({ data: null, error: new Error('Fixture database unavailable') }).then(resolve, reject);
        }
        const source = tables[table] || [];
        let rows = source.filter(row => filters.every(filter => filter(row)));
        if (action === 'insert') {
          rows = (Array.isArray(payload) ? payload : [payload]).map(row => ({
            ...(table === 'users' ? { subscription_status: 'inactive', stripe_customer_id: null } : {}),
            id: source.length + 1, ...row,
          }));
          source.push(...rows);
        }
        if (action === 'update') rows.forEach(row => Object.assign(row, payload));
        if (action === 'delete') tables[table] = source.filter(row => !rows.includes(row));
        rows = rows.map(row => columns === '*' || columns.includes('(') ? { ...row } :
          Object.fromEntries(columns.split(',').map(key => [key, row[key]])));
        return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve, reject);
      },
    };
    return query;
  },
};
const modules = new Map();
function load(relativePath) {
  const file = path.resolve(__dirname, '..', relativePath);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = name => {
    if (name === '@/lib/supabase/server') return { createClient: () => db };
    if (name === '@/lib/nodemailer') return { sendUserApprovedEmail: async () => {}, sendSystemNotification: async () => {} };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.ts`));
    return require(name);
  };
  vm.compileFunction(code, ['require', 'module', 'exports'], { filename: file })(localRequire, module, module.exports);
  return module.exports;
}
const { hasDashboardAccess, getLoginDestination, hasAdminConsoleAccess } = load('src/lib/accountAccess.ts');
const viewer = { role: 'viewer', is_admin: false, is_approved: true, subscription_status: 'inactive', stripe_customer_id: null };

test('approved invited members get dashboard access without a paid subscription', () => {
  assert.equal(hasDashboardAccess(viewer, false), true);
  assert.equal(hasDashboardAccess({ ...viewer, subscription_status: null }, false), true);
  assert.equal(getLoginDestination(viewer, { hasDashboardAccess: true, hasAnySubscription: false }), '/dashboard');
});

test('staff use the admin console and both admin representations are honored', () => {
  for (const account of [
    { ...viewer, role: 'admin' }, { ...viewer, role: 'opportunity_manager' },
    { ...viewer, role: 'sales_member' }, { ...viewer, is_admin: true, is_approved: false },
  ]) {
    assert.equal(hasAdminConsoleAccess(account), true);
    assert.equal(hasDashboardAccess(account, false), true);
    assert.equal(getLoginDestination(account, { hasDashboardAccess: true, hasAnySubscription: false }), '/admin');
  }
});

test('pending users and inactive billing relationships stay restricted', () => {
  assert.equal(hasDashboardAccess({ ...viewer, is_approved: false }, false), false);
  assert.equal(hasDashboardAccess({ ...viewer, is_approved: false, subscription_status: 'active' }, true), false);
  assert.equal(hasDashboardAccess(viewer, true), false);
  assert.equal(hasDashboardAccess({ ...viewer, stripe_customer_id: 'cus_existing' }, false), false);
  for (const status of ['canceled', 'past_due', 'incomplete', 'unpaid', 'paused']) {
    assert.equal(hasDashboardAccess({ ...viewer, subscription_status: status }, false), false);
  }
  assert.equal(getLoginDestination(viewer, { hasDashboardAccess: false, hasAnySubscription: true }), '/dashboard/settings');
  assert.equal(getLoginDestination(viewer, { hasDashboardAccess: false, hasAnySubscription: false }), '/membership');
});

test('active paid memberships keep their existing access', () => {
  assert.equal(hasDashboardAccess({ ...viewer, subscription_status: 'active', stripe_customer_id: 'cus_existing' }, true), true);
});

test('admin creates accounts, each signs in and reads its own dashboard access', async () => {
  const auth = load('src/lib/auth.ts');
  const usersRoute = load('src/app/api/admin/users/route.ts');
  const loginRoute = load('src/app/api/auth/login/route.ts');
  const sessionRoute = load('src/app/api/auth/session/route.ts');
  const accessRoute = load('src/app/api/subscription/status/route.ts');
  const password = 'Fixture-only-password-2026!';
  tables.users.push({ ...viewer, id: 100, role: 'admin', is_admin: true, email: 'owner@example.test', full_name: 'Owner', password_hash: await auth.hashPassword(password) });
  const owner = await auth.login('owner@example.test', password);
  const request = (url, body, cookie) => new Request(`http://localhost${url}`, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const noSession = await accessRoute.GET(request('/api/subscription/status'));
  assert.equal(noSession.status, 401);
  for (const role of ['admin', 'viewer', 'sales_member', 'opportunity_manager']) {
    const email = `${role}@example.test`;
    const created = await usersRoute.POST(request('/api/admin/users', { email, password, fullName: `Fixture ${role}`, role, status: 'personal' }, `authToken=${owner.token}`));
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.user.password_hash, undefined);
    const login = await loginRoute.POST(request('/api/auth/login', { email: ` ${email.toUpperCase()} `, password }));
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(login.headers.get('set-cookie'), /SameSite=lax/i);
    const loggedIn = await login.json();
    assert.equal(loggedIn.user.password_hash, undefined);
    assert.equal(loggedIn.user.role, role);
    const session = await sessionRoute.GET(request('/api/auth/session', null, cookie));
    assert.equal(session.status, 200);
    const accessResponse = await accessRoute.GET(request('/api/subscription/status?userId=100', null, cookie));
    assert.equal(accessResponse.status, 200);
    const access = await accessResponse.json();
    assert.equal(access.hasDashboardAccess, true);
    assert.equal(access.status, 'inactive', 'must not fabricate a paid subscription');
    assert.equal(access.hasAnySubscription, false);
    assert.equal(access.subscription, null);
    assert.equal(getLoginDestination(loggedIn.user, access), role === 'viewer' ? '/dashboard' : '/admin');
    if (role === 'viewer') {
      const denied = await usersRoute.POST(request('/api/admin/users', { email: 'escalation@example.test', password, fullName: 'Denied', status: 'personal', role: 'admin' }, cookie));
      assert.equal(denied.status, 403);
      tables.subscriptions.push({ user_id: loggedIn.user.id, status: 'canceled', created_at: new Date().toISOString() });
      const canceled = await (await accessRoute.GET(request('/api/subscription/status', null, cookie))).json();
      assert.equal(canceled.hasDashboardAccess, false);
      assert.equal(getLoginDestination(loggedIn.user, canceled), '/dashboard/settings');
      failSubscriptions = true;
      const unavailable = await accessRoute.GET(request('/api/subscription/status', null, cookie));
      assert.equal(unavailable.status, 500);
      assert.equal((await unavailable.json()).hasDashboardAccess, undefined);
      failSubscriptions = false;
    }
  }
  assert.equal(await auth.login('viewer@example.test', 'incorrect-password'), null);
  const row = tables.users.find(user => user.email === 'viewer@example.test');
  row.is_approved = false;
  await assert.rejects(auth.login(row.email, password), auth.AccountNotApprovedError);
});
