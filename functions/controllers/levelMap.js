const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const middleAdminWare = require("../authAdminMiddleWare");
const middleWare = require("../authMiddleWare");

const admin = require("firebase-admin");

const editLevelMap = express();
const getLevelMap = express();

editLevelMap.use(cors({ origin: true }));
editLevelMap.use(middleAdminWare)
getLevelMap.use(cors({ origin: true }));
getLevelMap.use(middleWare)

//trigger
exports.updateLevelMap = functions.firestore.document("levels/{levelNumber}").onUpdate(async (snap, context) => {
  if (isNaN(context.params.levelNumber))
  {
    //is update version?
    return false;
  }

  return admin.firestore().collection("levels").doc("version").update({
    version: admin.firestore.FieldValue.increment(1)
  });
});

exports.addLevelMap = functions.firestore.document("levels/{levelNumber}").onCreate(async (snap, context) => {
  if (isNaN(context.params.levelNumber))
  {
    //is update version?
    return false;
  }

  let initialLevelData;

  (await admin.firestore().collection("users").listDocuments()).forEach(async doc => {
    if (context.params.levelNumber == 1)
    {
      //level always able to open when it is the first level
      initialLevelData = {
        [context.params.levelNumber]: {
          levelNumber: parseInt(context.params.levelNumber),
          score: 0,
          state: 2
        },
      };
    }
    else
    {
      let userSnapshot = await doc.get();
      //check previous level is lock or not
      if (userSnapshot.data().levelDatas[context.params.levelNumber - 1].state == 0)
      {
        initialLevelData = {
          [context.params.levelNumber]: {
            levelNumber: parseInt(context.params.levelNumber),
            score: 0,
            state: 0
          },
        };
      }
      else
      {
        initialLevelData = {
          [context.params.levelNumber]: {
            levelNumber: parseInt(context.params.levelNumber),
            score: 0,
            state: 2
          },
        };
      }
    }

    doc.set({
      levelDatas: initialLevelData
    }, { merge: true });
  });

  // const versionSnapshot = await admin.firestore().collection("levels").doc("version").get();

  // if(!versionSnapshot.exists)
  // {
  //   return versionSnapshot.ref.create({
  //     version: 1
  //   });
  // }
  // else
  // {
    return admin.firestore().collection("levels").doc("version").update({
      version: admin.firestore.FieldValue.increment(1)
    });
  // }
});

exports.deleteLevelMap = functions.firestore.document("levels/{levelNumber}").onDelete(async (snap, context) => {
  if (isNaN(context.params.levelNumber))
  {
    //is update version?
    return false;
  }

  (await admin.firestore().collection("users").listDocuments()).forEach(doc => {
    doc.set({
      levelDatas: {
        [context.params.levelNumber]: admin.firestore.FieldValue.delete()
      }
    }, { merge: true });
  });

  const versionSnapshot = await admin.firestore().collection("levels").doc("version").get();

  if(!versionSnapshot.exists)
  {
    return false;
  }

  return versionSnapshot.ref.update({
    version: admin.firestore.FieldValue.increment(1)
  });
});

function handleResponse (response, levelNumber, status, body){
  functions.logger.log(
    { Level: levelNumber },
    {
      Response: {
        Status: status,
        Body: body,
      },
    }
  );
  if (body) {
    return response.status(status).json(body);
  }
  return response.sendStatus(status);
};

editLevelMap.post("/update-all-map", async (req, res) => {
  const body = req.body;

  let myMap = new Map(Object.entries(body.maps));
  myMap.forEach(async (value, key) => {
    await admin.firestore().collection("levels").doc(key).set(value).catch((err) => {
      console.log(err);
      return handleResponse(res, "all", 500);
    });
  });

  await admin.firestore().collection("levels").doc("version").set({
    version: body.version
  }, { merge: true }).catch((err) => {
    console.log(err);
    return handleResponse(res, "all", 500);
  });

  return handleResponse(res, "all", 200);
});

editLevelMap.post("/add-map", async (req, res) => {
  const body = req.body;

  //no plus 1 because in levels collection has version field
  const newLevel = (await admin.firestore().collection("levels").listDocuments()).length;

  if (newLevel == 1)
  {
    await admin.firestore().collection("levels").doc("version").set({
      version: 1
    }, { merge: true }).catch((err) => {
      console.log(err);
      return handleResponse(res, "all", 500);
    });
  }

  return admin.firestore().collection("levels").doc(newLevel.toString()).set(body).catch((err) => {
    console.log(err);
    return handleResponse(res, newLevel, 500);
  }).then(() => {
    return handleResponse(res, newLevel, 200);
  });
});

editLevelMap.put("/update-map", async (req, res) => {
  const body = req.body;

  let myMap = new Map(Object.entries(body));
  myMap.forEach(async (value, key) => {
    await admin.firestore().collection("levels").doc(key).set(value).catch((err) => {
      console.log(err);
      return handleResponse(res, key, 500);
    }).then(() => {
      return handleResponse(res, key, 200);
    });
  });
});

getLevelMap.get("/get-all-map", async (req, res) => {
  admin.firestore().collection("levels").get().then((querySnapshot) => {
    let docsTemp = querySnapshot.docs.map((doc) => doc);

    //convert array to map
    let map = new Map(docsTemp.map(doc => [doc.id, doc.data()]));

    let version = map.get("version");
    map.delete("version");

    return handleResponse(res, "all", 200, {
      version: version.version,
      maps: Object.fromEntries(map)
    });
  }).catch((err) => {
    console.log(err);
    return handleResponse(res, "all", 500);
  });
});

getLevelMap.get("/get-current-version-of-map", async (req, res) => {
  return handleResponse(res, "all", 200, (await admin.firestore().collection("levels").doc("version").get()).data());
});

exports.editLevelMap = functions.https.onRequest(editLevelMap);
exports.getLevelMap = functions.https.onRequest(getLevelMap);