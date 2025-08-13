const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function getAdminTokens() {
  const snap = await db.collection('users').where('role','==','admin').get();
  const tokens = [];
  snap.forEach(doc=>{ (doc.data().fcmTokens||[]).forEach(t=>tokens.push(t)); });
  return tokens;
}

exports.scheduledNotifier = functions.pubsub.schedule('every 30 minutes').onRun(async () => {
  const now = admin.firestore.Timestamp.now();
  const end = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24*60*60*1000));
  const snap = await db.collection('orders')
    .where('scheduledStart','>=',now)
    .where('scheduledStart','<=',end)
    .where('notified24h','!=', true)
    .get();
  const adminTokens = await getAdminTokens();
  for (const doc of snap.docs) {
    const data = doc.data();
    const tokens = [...adminTokens];
    if (data.assignedTo) {
      const u = await db.collection('users').doc(data.assignedTo).get();
      (u.data().fcmTokens||[]).forEach(t=>tokens.push(t));
    }
    if (tokens.length) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: 'Lembrete de OS', body: data.items?.[0]?.name || '' }
      });
    }
    await doc.ref.update({ notified24h: true });
    try {
      await db.collection('mail').add({
        to: [data.email || ''],
        message: { subject: 'Lembrete de serviço', text: 'Seu serviço ocorrerá em breve.' }
      });
    } catch(e) {}
  }
});

exports.orderStatusNotify = functions.firestore.document('orders/{id}').onWrite(async (change, context) => {
  const before = change.before.data();
  const after = change.after.data();
  if (!after) return;
  if (before && before.status === after.status) return;
  if (!['em_andamento','concluido'].includes(after.status)) return;
  const tokens = await getAdminTokens();
  if (after.assignedTo) {
    const u = await db.collection('users').doc(after.assignedTo).get();
    (u.data().fcmTokens||[]).forEach(t=>tokens.push(t));
  }
  if (tokens.length) {
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: `OS ${after.status}`, body: after.notes || '' }
    });
  }
});

function diff(before, after) {
  const out = {};
  Object.keys(after || {}).forEach(k => {
    if (JSON.stringify(before?.[k]) !== JSON.stringify(after[k])) {
      out[k] = { before: before?.[k], after: after[k] };
    }
  });
  Object.keys(before || {}).forEach(k => {
    if (!(k in (after||{}))) {
      out[k] = { before: before[k], after: null };
    }
  });
  return out;
}

function logChange(collection) {
  return functions.firestore.document(`${collection}/{id}`).onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    const action = !before ? 'create' : !after ? 'delete' : 'update';
    const d = diff(before, after);
    await db.collection('auditLogs').add({
      collection,
      docId: context.params.id,
      action,
      diff: d,
      ts: admin.firestore.FieldValue.serverTimestamp(),
      actorUid: context.auth?.uid || null,
      actorEmail: context.auth?.token?.email || null
    });
  });
}

exports.customerLog = logChange('customers');
exports.vehicleLog = logChange('vehicles');
exports.serviceLog = logChange('services');
exports.orderLog = logChange('orders');

async function handleQuoteDecision(req, res, status) {
  const token = req.query.token;
  if (!token) return res.status(400).send('token missing');
  const pubRef = db.collection('quotes_public').doc(token);
  const snap = await pubRef.get();
  if (!snap.exists) return res.status(404).send('not found');
  const data = snap.data();
  const quoteId = data.quoteId;
  if (!quoteId) return res.status(400).send('invalid');
  const quoteRef = db.collection('quotes').doc(quoteId);
  await quoteRef.update({
    status,
    decisionAt: admin.firestore.FieldValue.serverTimestamp(),
    decisionSource: 'public'
  });
  await db.collection('auditLogs').add({
    collection: 'quotes',
    docId: quoteId,
    action: 'update',
    diff: { status: { before: data.status, after: status } },
    ts: admin.firestore.FieldValue.serverTimestamp(),
    actorUid: null,
    actorEmail: null
  });
  return res.json({ ok: true });
}

exports.acceptQuote = functions.https.onRequest((req, res) => handleQuoteDecision(req, res, 'aceito'));
exports.rejectQuote = functions.https.onRequest((req, res) => handleQuoteDecision(req, res, 'rejeitado'));
