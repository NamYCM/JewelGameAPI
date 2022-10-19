const bcrypt = require("bcrypt");
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const middleAdminWare = require("../authAdminMiddleWare");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const adminApp = express();
adminApp.use(cors({ origin: true }));
adminApp.use(middleAdminWare);

exports.admin = functions.https.onRequest(adminApp);

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jewelgameproject@gmail.com",
    pass: "srrlymuhxtmxydgf"
  }
});

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

adminApp.post("/sign-up", async (req, res) => {
  const body = req.body;

  const user = await admin.auth().getUserByEmail(req.user.email);
  if (user.customClaims && body.code && body.code == user.customClaims.verifyCode) {
    functions.logger.log("verify code succesfully");
  } else {
    return handleResponse(res, req.user.email, 400, "invalid code");
  }

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

  const tokenURL = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC8FE3pSDKPpreuE31QBD5ZQEmbXEYEtG4';
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
  functions.logger.log(response);

  if (response.error)
  {
    return handleResponse(res, username, response.error.code, response.error.message);
  }

  const additionalClaims = {
    adminRole: true,
    verifyCode: null
  };
  const newUser = await admin.auth().getUserByEmail(username);
  await admin.auth().setCustomUserClaims(newUser.uid, additionalClaims);

  //reset code
  // admin.auth().setCustomUserClaims(user.uid, additionalClaims);

  return handleResponse(res, username, 200);
});

adminApp.put("/send-verify-gmail", async (req, res) => {
  const code = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);

  const mailOptions = {
    from: 'jewelgameproject@gmail.com', //Adding sender's email
    to: req.user.email, //Getting recipient's email by query string
    subject: 'Verify Code', //Email subject
    html: '<b>Your code to create a new admin account is: ' + code + '</b>' //Email content in HTML
  };

  //Returning result
  transporter.sendMail(mailOptions, async (err, info) => {
    if(err){
      functions.logger.error(err);
      return handleResponse(res, req.user.email, 400, err.toString());
    }

    const user = await admin.auth().getUserByEmail(req.user.email);
    const additionalClaims = {
      adminRole: user.customClaims.adminRole,
      userRole: user.customClaims.userRole,
      verifyCode: code
    };
    
    await admin.auth().setCustomUserClaims(user.uid, additionalClaims);
    return handleResponse(res, req.user.email, 200);
  });
});