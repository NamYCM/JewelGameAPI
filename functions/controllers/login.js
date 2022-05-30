const bcrypt = require("bcrypt");
const functions = require("firebase-functions");
const cors = require("cors");
const fetch = require("node-fetch");
const express = require("express");

const admin = require("firebase-admin");

const login = express();
login.use(cors({ origin: true }));

exports.login = functions.https.onRequest(login);

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

login.get("/verify-token/:idToken", async (req, res) => {
  const decodedIdToken = await admin.auth().verifyIdToken(req.params.idToken);
  res.send(decodedIdToken);
});

login.get("/sign-in/:username-:password", async (req, res) => {
  //check null data
  let username = req.params.username;
  if (!username)
  {
    return handleResponse(res, username, 401, "lossing username in body");
  }

  let password = req.params.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  //check username, password
  const userSnapshot = await admin.firestore().collection("users").doc(username).get();

  if (!userSnapshot.exists)
  {
    return handleResponse(res, username, 401, "username is not exists");
  }
  else
  {
    try {
      if(!bcrypt.compareSync(password, userSnapshot.data().password))
      {
        return handleResponse(res, username, 401, "password is not correct");
      }
    } catch (error) {
      console.log(error);
      return handleResponse(res, username, 500);
    }

    const additionalClaims = {
      userRole: true
    };
    const token = await admin.auth().createCustomToken(req.params.username, additionalClaims);
    const tokenURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyC8FE3pSDKPpreuE31QBD5ZQEmbXEYEtG4';
    const response = await fetch(tokenURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        returnSecureToken: true
      })
    }).then(r => r.json());

    return handleResponse(res, username, 200, {
      username: username,
      token: response.idToken,
      ...userSnapshot.data()
    });
  }
});

login.get("/sign-in-admin/:username-:password", async (req, res) => {
  //check null data
  let username = req.params.username;
  if (!username)
  {
    return handleResponse(res, username, 401, "lossing username in body");
  }

  let password = req.params.password;
  if (!password)
  {
    return handleResponse(res, username, 401, "lossing password in body");
  }

  // if (username == 'hnam19052000@gmail.com')
  // {
  //   const additionalClaims = {
  //     adminRole: true,
  //     verifyCode: null
  //   };
  //   const user = await admin.auth().getUserByEmail(username);
  //   await admin.auth().setCustomUserClaims(user.uid, additionalClaims);
  // }

  const tokenURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyC8FE3pSDKPpreuE31QBD5ZQEmbXEYEtG4';
  const response = await fetch(tokenURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: username,
      password: password,
      returnSecureToken: true
    })
  }).then(r => r.json());

  if (response.error)
  {
    return handleResponse(res, username, response.error.code, response.error.message);
  }


  return handleResponse(res, username, 200, {
    username: username,
    token: response.idToken
  });

  // //check username, password
  // const userSnapshot = await admin.firestore().collection("admins").doc(username).get();

  // if (!userSnapshot.exists)
  // {
  //   return handleResponse(res, username, 401, "username of admin is not exists");
  // }
  // else
  // {
  //   try {
  //     if(password != userSnapshot.data().password)
  //     {
  //       return handleResponse(res, username, 401, "password is not correct");
  //     }
  //   } catch (error) {
  //     console.log(err);
  //     return handleResponse(res, username, 500);
  //   }

  //   // const additionalClaims = {
  //   //   adminRole: true
  //   // };

  //   // const token = await admin.auth().createCustomToken(req.params.username, additionalClaims);
  //   const tokenURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyC8FE3pSDKPpreuE31QBD5ZQEmbXEYEtG4';
  //   const response = await fetch(tokenURL, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       email: username,
  //       password: password,
  //       returnSecureToken: true
  //     })
  //   }).then(r => r.json());
  //   console.log(response);

  //   return handleResponse(res, username, 200, {
  //     username: username,
  //     token: response.idToken,
  //     ...userSnapshot.data()
  //   });
  // }
});

login.post("/sign-up", async (req, res) => {
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