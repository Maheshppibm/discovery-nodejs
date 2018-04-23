const queryBuilder = require('./src/query-builder');

const NEWS_ENVIRONMENT_ID = 'system';
const NEWS_COLLECTION_ID = 'news';

const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');

const discovery = new DiscoveryV1({
  // If unspecified here, the DISCOVERY_USERNAME and
  // DISCOVERY_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
   username: 'e49218c9-1bf2-41ae-a625-2a7cfb02660b',
  password: 'LOcjTUkWvRgh',
  version_date: '2017-08-01',
});

// Bootstrap application settings
const express = require('express');
const path = require('path');

const app = express();
require('./config/express')(app);

//serve the react app files
app.use(express.static(`${__dirname}/ui-react/build`));
console.log("======= app.js ======");


function getWidgetQuery(request) {
  const widgetQueries = request.query.widgetQueries;

  if (!widgetQueries) {
    return null;
  }
console.log("widgetQueries--"+widgetQueries);
  return widgetQueries.split(',').reduce((widgetQuery, finalWidgetQuery) => {
    const queryBuilderWidgetQuery = queryBuilder.widgetQueries[widgetQuery];

    if (queryBuilderWidgetQuery) {
      const widgetAggregations = queryBuilderWidgetQuery.aggregations;

      if (widgetAggregations) {
        const currentAggregations = finalWidgetQuery.aggregations || [];
        delete queryBuilderWidgetQuery.aggregations;

        return Object.assign({}, finalWidgetQuery, queryBuilderWidgetQuery, {
          aggregations: currentAggregations.concat(widgetAggregations),
        });
      }
    }
    return Object.assign({}, finalWidgetQuery, queryBuilderWidgetQuery);
  }, {});
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// setup query endpoint for news
app.post('/api/query', (req, res, next) => {
  const queryParams = queryBuilder.build(req.body, getWidgetQuery(req));
console.log("queryParams----"+JSON.stringify(queryParams));
  if (queryParams.aggregations) {
    queryParams.aggregation = `[${queryParams.aggregations.join(',')}]`;
    delete queryParams.aggregations;
  }

  const params = Object.assign({}, queryParams, {
    environment_id: NEWS_ENVIRONMENT_ID,
    collection_id: NEWS_COLLECTION_ID,
  });

  discovery.query(params, (error, response) => {
    if (error) {
      next(error);
    } else {
      res.json(response);
    }
  });
});

// error-handler settings for all other routes
require('./config/error-handler')(app);

module.exports = app;
