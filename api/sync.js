'use strict';
const L = require('./_lib');

/**
 * GET /api/sync?v=<lastSeenVersion>
 * Cheap change-detection poll. Returns {unchanged:true} when nothing changed,
 * otherwise the complete shared state (items+stock, transactions, settings,
 * drawer, users) so every PC renders identical data.
 */
module.exports = L.handler(async (req, res) => {
  if (req.method !== 'GET') return L.send(res, 405, { error: 'Method not allowed' });

  const userId = L.verifyToken(req);
  if (!userId) return L.send(res, 401, { error: 'Not signed in' });

  const [userJson, meta] = await L.rpipeline([
    ['HGET', L.K.users, userId],
    ['HMGET', L.K.meta, 'ver', 'shift']
  ]);
  let user = null;
  try { user = userJson ? JSON.parse(userJson) : null; } catch (e) { user = null; }
  if (!user || !L.isActive(user)) return L.send(res, 401, { error: 'Account disabled or removed' });

  let ver = Number(meta && meta[0]) || 0;
  const shiftId = L.currentShiftId();
  if ((meta && meta[1]) !== shiftId) {
    const newVer = await L.rollShift(shiftId);
    if (newVer !== null) ver = newVer;
  }

  const since = Number(req.query && req.query.v);
  if (Number.isFinite(since) && since === ver) {
    return L.send(res, 200, { unchanged: true, version: ver });
  }

  const [itemsH, stockH, txnsH, settingsJ, drawerJ] = await L.rpipeline([
    ['HGETALL', L.K.items],
    ['HGETALL', L.K.stock],
    ['HGETALL', L.K.txns],
    ['GET', L.K.settings],
    ['GET', L.K.drawer]
  ]);
  const users = await L.getAllUsers();

  const stock = L.toObj(stockH);
  const items = Object.values(L.toObj(itemsH)).map(s => {
    try {
      const it = JSON.parse(s);
      it.beginningStock = Number(stock[it.id + '|b']) || 0;
      it.addedStock = Number(stock[it.id + '|a']) || 0;
      it.deductedStock = Number(stock[it.id + '|d']) || 0;
      it.currentStock = Number(stock[it.id + '|c']) || 0;
      return it;
    } catch (e) { return null; }
  }).filter(Boolean).sort((a, b) => (Number(b._ord) || 0) - (Number(a._ord) || 0));

  const transactions = Object.values(L.toObj(txnsH)).map(s => {
    try { return JSON.parse(s); } catch (e) { return null; }
  }).filter(Boolean).sort((a, b) => (Number(b._ord) || 0) - (Number(a._ord) || 0));

  const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };

  L.send(res, 200, {
    version: ver,
    items,
    transactions,
    settings: parse(settingsJ),
    drawer: parse(drawerJ),
    users: users.map(L.sanitizeUser),
    me: L.sanitizeUser(user)
  });
});
