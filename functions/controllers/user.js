const bcrypt = require("bcrypt");
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const middleWare = require("../authUserMiddleWare");

const admin = require("firebase-admin");
const serviceAccount = require("./testapi-d3e3a-firebase-adminsdk-ugz7c-283145ec96.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  serviceAccountId: '557118488155-0805je95oibqa2l4fpc1ni5j706pecvd.apps.googleusercontent.com'
});

const userApp = express();
userApp.use(cors({ origin: true }));
userApp.use(middleWare);

function handleResponse (response, username, status, body){
  functions.logger.log(
    { User: username },
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

userApp.get("/:username", async (req, res) => {
  //check null data
  let username = req.params.username;
  if (!username)
  {
    return handleResponse(res, username, 401, "lossing username in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists)
  {
    return handleResponse(res, username, 401, "username is not exists");
  }
  else
  {
    return handleResponse(res, username, 200, {
      username: username,
      ...userSnapshot.data()
    });
  }
});

userApp.post("/sign-up", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 401, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username dulicate
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (userSnapshot.exists)
  {
    return handleResponse(res, username, 401, "username is already exists");
  }
  else
  {
    delete body.username;
    body.password = bcrypt.hashSync(body.password, 12);
    await userSnapshot.ref.create(body).then(() => {
      return handleResponse(res, username, 200);
    }).catch(() => {
      return handleResponse(res, username, 401, "something wrong!!!");
    })
  }
});

userApp.put("/update", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 403, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists || password != userSnapshot.data().password)
  {
    return handleResponse(res,username, 401);
  }

  //update
  delete body.username;
  return admin.firestore().collection("users").doc(username).update(body).then(async () => {
    //TODO can I don't send the data to client?
    const snapshot = await admin.firestore().collection("users").doc(username).get();

    return handleResponse(res, username, 200, snapshot.data());
  }).catch(() => {
    return handleResponse(res, username, 404, "something wrong");
  });
});

userApp.put("/update-level-data/:levelNumber", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 403, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists || password != userSnapshot.data().password)
  {
    return handleResponse(res,username, 401);
  }

  //get new data
  // const oldData = userSnapshot.data().levelDatas[req.params.levelNumber];
  // if (!oldData) throw new functions.https.HttpsError('not-found', "missing level " + req.params.levelNumber);
  const newData = body.levelDatas[req.params.levelNumber];
  if (!newData) return handleResponse(res, username, 404, "missing data of level " + req.params.levelNumber + "in body");

  //update
  //TODO maybe I should use transaction in here
  userSnapshot.ref.set({
    "levelDatas": {
      [req.params.levelNumber]: {
        "score": newData.score,
        "state": newData.state
      }
    }
  }, { merge: true }).then( async () => {
    //send new data to client
    return handleResponse(res, username, 200, "");
    // return handleResponse(res, username, 200, (await admin.firestore().collection("users").doc(username).get()).data());
  }).catch((e) => {
    //log error
    console.log(e);

    return handleResponse(res, username, 404, "something wrong");
  });
});

userApp.put("/update-current-level", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 403, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  let currentLevel = body.currentLevel;
  if (!currentLevel)
  {
    return handleResponse(res, username, 401, "lossing current level in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists || password != userSnapshot.data().password)
  {
    return handleResponse(res,username, 401);
  }

  //update
  userSnapshot.ref.update({
    currentLevel: currentLevel
  }).then( async () => {
    //send new data to client
    return handleResponse(res, username, 200, "");
    // return handleResponse(res, username, 200, (await admin.firestore().collection("users").doc(username).get()).data());
  }).catch((e) => {
    //log error
    console.log(e);

    return handleResponse(res, username, 404, "something wrong");
  });
});

userApp.put("/increte-money/:increment", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 403, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists || password != userSnapshot.data().password)
  {
    return handleResponse(res,username, 401);
  }

  let newMoney = userSnapshot.data().money + parseInt(req.params.increment);

  if (newMoney < 0) newMoney = 0;

  //update
  userSnapshot.ref.update({
    money: newMoney
  }).then( async () => {
    //send new data to client
    // return handleResponse(res, username, 200, "");
    return handleResponse(res, username, 200, newMoney);
  }).catch((e) => {
    //log error
    console.log(e);

    return handleResponse(res, username, 404, "something wrong");
  });
});

userApp.put("/buy-item/:type", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 403, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists || password != userSnapshot.data().password)
  {
    return handleResponse(res,username, 401);
  }

  //get price of item
  const shopSnapshot = await admin.firestore().collection("shop").doc("items").get();
  const price = shopSnapshot.data().shopItems[req.params.type].Price;

  //if not enough money
  if(userSnapshot.data().money < price) return handleResponse(res, username, 200, "user don't have enough money");

  //deduct money
  userSnapshot.ref.update({
    money: userSnapshot.data().money - price
  }).then( async () => {
    //add item
    userSnapshot.ref.set({
      "specialPiecesAmount": {
        [req.params.type]: admin.firestore.FieldValue.increment(1)
      }
    }, { merge: true }).then(() => {
      return handleResponse(res, username, 200, "");
    }).catch((e) => {
      //log error
      console.log(e);
      return handleResponse(res, username, 404, "something wrong");
    });
  }).catch((e) => {
    //log error
    console.log(e);
    return handleResponse(res, username, 404, "something wrong");
  });
});

userApp.put("/use-item/:type", async (req, res) => {
  const body = req.body;

  //check null data
  let username = body.username;
  if (!username)
  {
    return handleResponse(res, username, 403, "lossing username in body");
  }

  let password = body.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists || password != userSnapshot.data().password)
  {
    return handleResponse(res,username, 401);
  }

  userSnapshot.ref.set({
    "specialPiecesAmount": {
      [req.params.type]: admin.firestore.FieldValue.increment(-1)
    }
  }, { merge: true }).then( async () => {
    return handleResponse(res, username, 200, "");
  }).catch((e) => {
    //log error
    console.log(e);

    return handleResponse(res, username, 404, "something wrong");
  });
});

exports.user = functions.https.onRequest(userApp);