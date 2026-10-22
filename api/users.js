'use strict';
const L = require('./_lib');

/**
 * POST /api/users   { action: 'create' | 'update' | 'delete' | 'password', ... }
 * Accounts live only in the central database. Passwords are stored as scrypt hashes.
 */
const USERNAME_RE = /^[a-z0-9._-]{2,32}$/;

async function saveUser(u) {
  await L.rpipeline([['HSET', L.K.users, u.id, JSON.stringify(u)], L.bumpCmd()]);
}

function publicList(users) {
  return users.map(L.sanitizeUser);
}

function activeAdminCount(users, exceptId) {
  return users.filter(u => u.id !== exceptId && L.isActive(u) && L.isAdminUser(u)).length;
}

module.exports = L.handler(async (req, res) => {
  if (req.method !== 'POST') return L.send(res, 405, { error: 'Method not allowed' });
  const me = await L.authUser(req, res);
  if (!me) return;

  const body = L.readBody(req);
  const action = body.action;
  const users = await L.getAllUsers();

  // ── Change own password (any signed-in user) ──────────────────────────────
  if (action === 'password') {
    const self = users.find(u => u.id === me.id);
    if (!self) return L.send(res, 404, { error: 'User not found.' });
    if (!L.verifyPassword(String(body.currentPassword || ''), self.passHash)) {
      return L.send(res, 400, { error: 'Current password is incorrect.' });
    }
    const np = String(body.newPassword || '');
    if (np.length < 4) return L.send(res, 400, { error: 'New password must be at least 4 characters long.' });
    self.passHash = L.hashPassword(np);
    delete self.mustChange;
    await saveUser(self);
    return L.send(res, 200, { ok: true, user: L.sanitizeUser(self), users: publicList(await L.getAllUsers()) });
  }

  // ── Everything below is Owner / Administrator only ────────────────────────
  if (!L.isAdminUser(me)) {
    return L.send(res, 403, { error: 'Only an Owner or Administrator can manage accounts.' });
  }

  if (action === 'create') {
    const d = body.user || {};
    const username = String(d.username || '').toLowerCase().trim();
    if (!USERNAME_RE.test(username)) {
      return L.send(res, 400, { error: 'Username must be 2-32 characters: letters, numbers, dot, dash or underscore.' });
    }
    if (users.some(u => u.username === username)) {
      return L.send(res, 400, { error: 'Username already exists. Please choose a unique username.' });
    }
    if (String(d.password || '').length < 4) {
      return L.send(res, 400, { error: 'Password must be at least 4 characters long.' });
    }
    const rec = L.newUserRecord({ ...d, username });
    await saveUser(rec);
    return L.send(res, 200, { ok: true, user: L.sanitizeUser(rec), users: publicList(await L.getAllUsers()) });
  }

  if (action === 'update') {
    const target = users.find(u => u.id === body.id);
    if (!target) return L.send(res, 404, { error: 'User not found' });
    const upd = body.updates || {};
    const next = { ...target };

    if (upd.username !== undefined) {
      const uname = String(upd.username).toLowerCase().trim();
      if (!USERNAME_RE.test(uname)) return L.send(res, 400, { error: 'Invalid username.' });
      if (users.some(u => u.id !== target.id && u.username === uname)) {
        return L.send(res, 400, { error: 'Username already in use by another account' });
      }
      next.username = uname;
    }
    ['fullName', 'role', 'level', 'prcLicense', 'phone', 'status'].forEach(f => {
      if (upd[f] !== undefined) next[f] = upd[f];
    });
    if (upd.fullName) {
      next.firstName = String(upd.fullName).split(' ')[0];
      next.initials = String(upd.fullName).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (Array.isArray(upd.permissions)) next.permissions = L.normalizePermissions(upd.permissions);
    if (next.level === 'Owner' || next.level === 'Admin') next.permissions = [...L.ALL_PERMISSIONS];
    if (upd.password) {
      if (String(upd.password).length < 4) return L.send(res, 400, { error: 'Password must be at least 4 characters long.' });
      next.passHash = L.hashPassword(upd.password);
      delete next.mustChange;
    }

    // Never allow the system to be left without an active administrator.
    const stillAdmin = L.isActive(next) && L.isAdminUser(next);
    if (!stillAdmin && L.isAdminUser(target) && activeAdminCount(users, target.id) === 0) {
      return L.send(res, 400, { error: 'At least one active Owner/Administrator account must remain.' });
    }
    if (target.id === me.id && !L.isActive(next)) {
      return L.send(res, 400, { error: 'You cannot deactivate the account you are currently logged in with.' });
    }

    await saveUser(next);
    return L.send(res, 200, { ok: true, user: L.sanitizeUser(next), users: publicList(await L.getAllUsers()) });
  }

  if (action === 'delete') {
    if (body.id === me.id) {
      return L.send(res, 400, { error: 'You cannot delete the account you are currently logged in with.' });
    }
    const target = users.find(u => u.id === body.id);
    if (!target) return L.send(res, 404, { error: 'User not found' });
    if (L.isAdminUser(target) && activeAdminCount(users, target.id) === 0) {
      return L.send(res, 400, { error: 'At least one active Owner/Administrator account must remain.' });
    }
    await L.rpipeline([['HDEL', L.K.users, target.id], L.bumpCmd()]);
    return L.send(res, 200, { ok: true, users: publicList(await L.getAllUsers()) });
  }

  L.send(res, 400, { error: 'Unknown action' });
});
