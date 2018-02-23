require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const helmet = require('helmet');
const schedule = require('node-schedule');
const https = require('https');

const { DB_URL, WWBL_PORT } = process.env;

const app = express();
app.use(express.static('public'));
app.use(helmet());
let db;

function coindeskApiHandler(response) {
  let body = '';
  response.on('data', (chunk) => {
    body += chunk;
  });

  response.on('end', () => {
    body = JSON.parse(body);
    const bpiKeys = Object.keys(body.bpi);
    for (let n = 0; n < bpiKeys.length; n += 1) {
      const date = bpiKeys[n];
      const obj = {
        _id: date,
        price: body.bpi[date],
      };
      db.collection('prices').replaceOne({ _id: date }, obj, { upsert: true }).catch(console.error.bind(console));
    }
  });
}

// scheduled function to run once a day
const rule = new schedule.RecurrenceRule();
rule.hour = 15;
rule.minute = 30;
schedule.scheduleJob(rule, () => {
  https.get('https://api.coindesk.com/v1/bpi/historical/close.json?for=yesterday', coindeskApiHandler);
});

app.get('/price/:price', (req, res) => {
  const reqPrice = req.params.price;
  if (!reqPrice) { res.status(403).send('Missing price'); } else if (isNaN(parseFloat(reqPrice)) && isFinite(reqPrice)) { res.status(403).send('Price must be numeric'); } else {
    db.collection('prices').find().sort({
      _id: -1,
    }).toArray((err, prices) => {
      if (err) {
        res.status(500).send(`Error querying prices db: ${err}`);
      } else if (!prices || prices.length === 0) {
        res.status(500).send('No prices returned from db');
      } else {
        for (let n = 0; n < prices.length; n += 1) {
          const price = prices[n];
          if (price.price <= reqPrice) {
            res.status(200).json(price);
            return;
          }
        }
      }
    });
  }
});

MongoClient.connect(DB_URL, (err, database) => {
  if (err) throw err;
  db = database;
  if (module === require.main) {
    // check last 30 days of price history on startup
    https.get('https://api.coindesk.com/v1/bpi/historical/close.json', coindeskApiHandler);
    app.listen(WWBL_PORT, () => {
      console.log(`App listening on port ${WWBL_PORT}`);
    });
  }
});
