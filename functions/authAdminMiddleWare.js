const admin = require("firebase-admin");
const functions = require('firebase-functions');

module.exports = validateFirebaseIdToken = async (req, res, next) => {
  functions.logger.log('Check if request is authorized with Firebase ID token');

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !(req.cookies && req.cookies.__session)) {
    functions.logger.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>',
      'or by passing a "__session" cookie.'
    );
    res.status(403).send('Unauthorized');
    return;
  }

  let infor, idToken, version, currentVersion;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    functions.logger.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    // infor = req.headers.authorization.split(' ');
    // if (infor.length < 3) {
    //   // No version
    //   res.status(403).send('Not found version');
    //   return;
    // } 
    // idToken = infor[1];
    // version = infor[2];
    // currentVersion = (await admin.firestore().collection("levels").doc("version").get()).data().version;
    // if (version != currentVersion) {
    //   res.status(403).send('Version is out of date');
    //   return;
    // }
    idToken = req.headers.authorization.split(' ')[1];
  } else if(req.cookies) {
    functions.logger.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send('Unauthorized');
    return;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    functions.logger.log('ID Token correctly decoded', decodedIdToken);

    if (decodedIdToken.adminRole)
    {
      req.user = decodedIdToken;
      next();
      return;
    }
    else
    {
      res.status(403).send('Invalid role');
      return;
    }
  } catch (error) {
    functions.logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).send('Unauthorized');
    return;
  }
};