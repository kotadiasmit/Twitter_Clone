tables --> user, follower, tweet, reply, like

**User Table**

| Column   | Type    |
| -------- | ------- |
| user_id  | INTEGER |
| name     | TEXT    |
| username | TEXT    |
| password | TEXT    |
| gender   | TEXT    |

**Follower Table**

| Column              | Type    |
| ------------------- | ------- |
| `follower_id`       | INTEGER |
| `follower_user_id`  | INTEGER |
| `following_user_id` | INTEGER |

Here, if user1 follows user2 then,

`follower_user_id` is the user ID of user1 and `following_user_id` is the user ID of user2.

**Tweet Table**

| Column    | Type     |
| --------- | -------- |
| tweet_id  | INTEGER  |
| tweet     | TEXT     |
| user_id   | INTEGER  |
| date_time | DATETIME |

**Reply Table**

| Column    | Type     |
| --------- | -------- |
| reply_id  | INTEGER  |
| tweet_id  | INTEGER  |
| reply     | TEXT     |
| user_id   | INTEGER  |
| date_time | DATETIME |

**Like Table**

| Column    | Type     |
| --------- | -------- |
| like_id   | INTEGER  |
| tweet_id  | INTEGER  |
| user_id   | INTEGER  |
| date_time | DATETIME |

SELECT tweet, count(like_id) as likes, count(reply_id) as replies, date_time as dateTime
FROM (tweet INNER JOIN reply ON tweet.tweet_id=reply.tweet_id) AS t
INNER JOIN like on t.tweet_id=like.tweet_id
WHERE user_id IN (
SELECT following_user_id
FROM follower INNER JOIN tweet ON follower.following_user_id=tweet.user_id
WHERE follower_user_id=${loginUser_UserId} AND
          tweet_id=${tweetId})`;

SELECT tweet, count(like_id) as likes, count(reply_id) as replies, date_time as dateTime
FROM (tweet INNER JOIN reply ON tweet.tweet_id=reply.tweet_id) AS t
INNER JOIN like on t.tweet_id=like.tweet_id
WHERE tweet_id=${tweetId}
