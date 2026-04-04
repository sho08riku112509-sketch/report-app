const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 便が追加されたとき or 割り当てが変わったとき通知を送る
exports.onDispatchChange = functions.database
  .ref("/dispatch/{roomId}")
  .onWrite(async (change, context) => {
    const before = change.before.val();
    const after = change.after.val();
    if (!after) return null;

    const oldRoutes = (before && before.routes) || [];
    const newRoutes = after.routes || [];
    const drivers = after.drivers || [];

    // 古いルートをマップ化
    const oldMap = {};
    oldRoutes.forEach((r) => { if (r) oldMap[r.id] = r; });

    // 新規追加された便
    const added = newRoutes.filter((r) => r && !oldMap[r.id]);

    // 新しく割り当てられた便（ドライバーが変わった）
    const assigned = newRoutes.filter((r) => {
      if (!r || !r.driverId) return false;
      const old = oldMap[r.id];
      return !old || old.driverId !== r.driverId;
    });

    // FCMトークン取得
    const tokensSnap = await admin.database().ref("fcmTokens").once("value");
    const tokensData = tokensSnap.val();
    if (!tokensData) return null;

    const notifications = [];

    // 全員に「新しい便が追加されました」通知
    if (added.length > 0) {
      const body = added
        .map((r) => r.tripNum + "便 " + r.destination + " " + r.cargo)
        .join(", ");
      Object.values(tokensData).forEach((t) => {
        if (t.token) {
          notifications.push(
            admin.messaging().send({
              token: t.token,
              notification: {
                title: "新しい便が追加されました",
                body: body,
              },
            }).catch(() => {})
          );
        }
      });
    }

    // 割り当てられた人に通知
    if (assigned.length > 0) {
      // ドライバーID→名前マップ
      const driverMap = {};
      drivers.forEach((d) => { if (d) driverMap[d.id] = d.name; });

      // 名前→割り当て便グループ
      const byName = {};
      assigned.forEach((r) => {
        const name = driverMap[r.driverId];
        if (!name) return;
        if (!byName[name]) byName[name] = [];
        byName[name].push(r);
      });

      Object.keys(byName).forEach((name) => {
        const tokenEntry = tokensData[encodeURIComponent(name)];
        if (!tokenEntry || !tokenEntry.token) return;
        const body = byName[name]
          .map((r) => r.tripNum + "便 " + r.destination + " " + r.cargo)
          .join(", ");
        notifications.push(
          admin.messaging().send({
            token: tokenEntry.token,
            notification: {
              title: "割り当てられました！",
              body: body,
            },
          }).catch(() => {})
        );
      });
    }

    return Promise.all(notifications);
  });
