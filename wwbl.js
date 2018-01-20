'use strict';

require('dotenv').config();

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const helmet = require('helmet');
var schedule = require('node-schedule');

const DB_URL = process.env.DB_URL;
const WWBL_PORT = process.env.WWBL_PORT;

const app = express();
app.use(express.static("public"));
app.use(helmet());
var db;

const https = require('https');

//scheduled function to once a day
var rule = new schedule.RecurrenceRule();
rule.hour = 15;
rule.minute = 30;
schedule.scheduleJob(rule, () => {
  https.get("https://api.coindesk.com/v1/bpi/historical/close.json?for=yesterday", (response) => {
    let body = '';
    response.on('data', (chunk) => {
      body += chunk;
    });

    response.on('end', () => {
      body = JSON.parse(body);
      for (var date in body.bpi) {
        const obj = {
          _id: date,
          price: body.bpi[date]
        };
        db.collection('prices').insertOne(obj).catch(console.log.bind(console));
      }
    });
  });
});

app.get('/price/:price', (req, res) => {
  const reqPrice = req.params.price;
  if (!reqPrice)
    res.status(403).send('Missing price');
  else if (isNaN(parseFloat(reqPrice)) && isFinite(reqPrice))
    res.status(403).send('Price must be numeric');
  else
    db.collection('prices').find().sort({
      _id: -1
    }).toArray((err, prices) => {
      if (err) {
        res.status(500).send('Error querying prices db: ' + err);
      } else if (!prices || prices.length === 0) {
        res.status(500).send('No prices returned from db');
      } else
        for (const price of prices) {
          if (price.price <= reqPrice) {
            res.status(200).json(price);
            return;
          }
        }
    });
});

MongoClient.connect(DB_URL, (err, database) => {
  if (err) throw err;
  db = database;
  if (module === require.main) {
    app.listen(WWBL_PORT, () => {
      console.log('App listening on port ' + WWBL_PORT);
    });
  }
});