const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running on http:/localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//MiddleWare Function//
const authenticateToken = (request, response, next) => {
  let jwtToken;
  let authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret_token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//GET LOGIN USER DETAILs//
const getLoginUser = async (request, response, next) => {
  let { username } = request;
  console.log(username);
  const selectUserQuery = `
     SELECT * FROM user
     WHERE username = "${username}";`;
  const loginUserDetails = await db.get(selectUserQuery);
  console.log(loginUserDetails);
  if (loginUserDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    request.loginUserDetails = loginUserDetails;
    //console.log(request);
    next();
  }
};

//Register User//
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkUserQuery = `
        SELECT * FROM user
        WHERE username = '${username}'`;
  const checkUser = await db.get(checkUserQuery);
  console.log(checkUser);
  if (checkUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const encryptedPassword = await bcrypt.hash(password, 10);
      const addUserQuery = `
        INSERT INTO user
        (name, username, password, gender)
        VALUES 
        ('${name}', '${username}', 
        '${encryptedPassword}', '${gender}');`;
      console.log(addUserQuery);
      const addUser = await db.run(addUserQuery);
      console.log(addUser);
      response.send("User created successfully");
    }
  }
});

//Login User//
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `
        SELECT * FROM user
        WHERE username = '${username}'`;
  const checkUser = await db.get(checkUserQuery);
  if (checkUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let checkPassword = await bcrypt.compare(password, checkUser.password);
    if (checkPassword === false) {
      response.status(400);
      response.send("Invalid password");
    } else {
      let payload = { username: username };
      let jwtToken = jwt.sign(payload, "secret_token");
      response.send({ jwtToken });
    }
  }
});
//API-3//
//Returns the latest tweets of people whom the user follows//
app.get(
  "/user/tweets/feed/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    let getUserTwitsQuery = `
      SELECT username, tweet, date_time as dateTime
      FROM user NATURAL JOIN tweet
      WHERE user_id IN (
      SELECT following_user_id 
        FROM follower
        WHERE follower_user_id=${loginUser_UserId})
      ORDER BY dateTime DESC
      LIMIT 4;
      `;
    console.log(getUserTwitsQuery);
    let getUserTwits = await db.all(getUserTwitsQuery);
    console.log(getUserTwits);
    response.send(getUserTwits);
  }
);

//API 4//
//Returns the list of all names of people whom the user follows//
app.get(
  "/user/following/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    let getFollowingUserQuery = `
      SELECT DISTINCT name
      FROM user
      WHERE user_id IN (
      SELECT following_user_id 
        FROM follower
        WHERE follower_user_id=${loginUser_UserId});
      `;
    console.log(getFollowingUserQuery);
    let getFollowingUser = await db.all(getFollowingUserQuery);
    console.log(getFollowingUser);
    response.send(getFollowingUser);
  }
);

//API 5//
//Returns the list of all names of people who follows the user//
app.get(
  "/user/followers/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    let getFollowersUserQuery = `
      SELECT DISTINCT name
      FROM user
      WHERE user_id IN (
      SELECT follower_user_id 
        FROM follower
        WHERE following_user_id=${loginUser_UserId});
      `;
    console.log(getFollowersUserQuery);
    let getFollowersUser = await db.all(getFollowersUserQuery);
    console.log(getFollowersUser);
    response.send(getFollowersUser);
  }
);

//API 6//
//If the user requests a tweet other than the users he is following//
//If the user requests a tweet of the user he is following, return response//
app.get(
  "/tweets/:tweetId/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    const { tweetId } = request.params;
    let getTweetQuery = `
      SELECT tweet, date_time as dateTime
      FROM tweet
      WHERE tweet_id=${tweetId} AND 
        user_id IN (
            SELECT following_user_id 
            FROM follower
            WHERE follower_user_id=${loginUser_UserId})`;
    //console.log(getTweetQuery);
    let likeCountQuery = `
     SELECT count(like_id) as likes
     FROM like WHERE tweet_id=${tweetId}`;
    let replyCountQuery = `
     SELECT count(reply_id) as replies
     FROM reply WHERE tweet_id=${tweetId}`;

    let getTweet = await db.get(getTweetQuery);
    let likeCount = await db.all(likeCountQuery);
    let replyCount = await db.all(replyCountQuery);
    if (getTweet !== undefined) {
      console.log(getTweet);
      console.log(likeCount);
      console.log(replyCount);
      response.send({
        tweet: getTweet.tweet,
        likes: likeCount[0].likes,
        replies: replyCount[0].replies,
        dateTime: getTweet.dateTime,
      });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 7//
//If the user requests a tweet other than the users he is following//
//If the user requests a tweet of a user he is following, return the list of usernames who liked the tweet//
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    const { tweetId } = request.params;
    let getTweetQuery = `
      SELECT tweet, date_time as dateTime
      FROM tweet
      WHERE tweet_id=${tweetId} AND 
        user_id IN (
            SELECT following_user_id 
            FROM follower
            WHERE follower_user_id=${loginUser_UserId})`;
    //console.log(getTweetQuery);

    let likeUserQuery = `
     SELECT username
     FROM like NATURAL JOIN user WHERE tweet_id=${tweetId}`;

    let getTweet = await db.get(getTweetQuery);
    let likeUser = await db.all(likeUserQuery);

    if (getTweet !== undefined) {
      console.log(getTweet);
      console.log(likeUser);
      response.send({ likes: likeUser.map((each) => each.username) });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 8//
//If the user requests a tweet other than the users he is following//
//If the user requests a tweet of a user he is following, return the list of replies.//
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    const { tweetId } = request.params;
    let getTweetQuery = `
      SELECT tweet, date_time as dateTime
      FROM tweet
      WHERE tweet_id=${tweetId} AND 
        user_id IN (
            SELECT following_user_id 
            FROM follower
            WHERE follower_user_id=${loginUser_UserId})`;
    //console.log(getTweetQuery);

    let replyUserQuery = `
     SELECT name, reply
     FROM reply NATURAL JOIN user WHERE tweet_id=${tweetId}`;

    let getTweet = await db.get(getTweetQuery);
    let replyUser = await db.all(replyUserQuery);

    if (getTweet !== undefined) {
      console.log(getTweet);
      console.log(replyUser);
      response.send({ replies: replyUser });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 9//
//Returns a list of all tweets of the user//
app.get(
  "/user/tweets/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);

    let getTweetQuery = `
      SELECT tweet, date_time as dateTime
      FROM tweet
      WHERE user_id=${loginUser_UserId}`;
    //console.log(getTweetQuery);

    let likeCountQuery = `
     SELECT count(like_id) as likes
     FROM like WHERE tweet_id IN 
        (SELECT tweet_id FROM tweet WHERE user_id=${loginUser_UserId})
     GROUP BY tweet_id`;

    let replyCountQuery = `
     SELECT count(reply_id) as replies
     FROM reply 
     WHERE tweet_id IN 
        (SELECT tweet_id FROM tweet WHERE user_id=${loginUser_UserId})
     GROUP BY tweet_id`;

    let getTweet = await db.all(getTweetQuery);
    let likeCount = await db.all(likeCountQuery);
    let replyCount = await db.all(replyCountQuery);

    if (getTweet !== undefined) {
      console.log(getTweet);
      console.log(likeCount);
      console.log(replyCount);
      let outPut = [];
      for (let each in getTweet) {
        //console.log(each);
        let newObject = {
          tweet: getTweet[each].tweet,
          likes: likeCount[each].likes,
          replies: replyCount[each].replies,
          dateTime: getTweet[each].dateTime,
        };
        outPut.push(newObject);
      }
      console.log(outPut);
      response.send(outPut);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 10//
//Create a tweet in the tweet table//
app.post(
  "/user/tweets/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    const { tweet } = request.body;
    let createTweetQuery = `
        INSERT INTO tweet
        (tweet, user_id)
        VALUES
        ('${tweet}', ${loginUser_UserId})`;

    let createTweet = await db.run(createTweetQuery);

    if (tweet !== undefined) {
      console.log(createTweet);
      response.send("Created a Tweet");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 11//
//Delete a own tweet from the tweet table//
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  getLoginUser,
  async (request, response) => {
    //console.log(request.loginUserDetails.user_id);

    const loginUser_UserId = request.loginUserDetails.user_id;
    console.log(loginUser_UserId);
    const { tweetId } = request.params;
    let deleteTweetQuery = `
        DELETE FROM tweet
        WHERE tweet_id=${tweetId} AND user_id=${loginUser_UserId}`;

    let deleteTweet = await db.run(deleteTweetQuery);
    let checkUserTweetQuery = `
        SELECT user_id FROM tweet 
        WHERE tweet_id = ${tweetId};`;
    let checkUser = await db.all(checkUserTweetQuery);
    console.log(checkUser);

    if (checkUser !== undefined) {
      console.log(deleteTweet);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);
module.exports = app;
