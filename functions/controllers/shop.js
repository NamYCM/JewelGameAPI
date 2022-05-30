const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const admin = require("firebase-admin");

const shop = express();
shop.use(cors({ origin: true }));

function handleResponse (response, shopItem, status, body){
  functions.logger.log(
    { Level: shopItem },
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

shop.post("/all-items", async (req, res) => {
  const body = req.body;

  await admin.firestore().collection("shop").doc("items").set(body).then(() => {
    return handleResponse(res, "all", 200);
  }).catch((err) => {
    console.log(err);
    return handleResponse(res, "all", 500);
  });
});

shop.get("/all-items", async (req, res) => {
  admin.firestore().collection("shop").doc("items").get().then((querySnapshot) => {
    return handleResponse(res, "all", 200, querySnapshot.data());
  }).catch((err) => {
    console.log(err);
    return handleResponse(res, "all", 500);
  });
});

// shop.get("/item/:type", async (req, res) => {
//   admin.firestore().collection("shop").doc("items").get().then((querySnapshot) => {
//     return handleResponse(res, "all", 200, querySnapshot.data());
//   }).catch((err) => {
//     console.log(err);
//     return handleResponse(res, "all", 500);
//   });
// });

exports.shop = functions.https.onRequest(shop);