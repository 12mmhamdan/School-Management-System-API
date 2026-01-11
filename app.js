const config                = require('./config/index.config.js');
const Cortex                = require('ion-cortex');
const ManagersLoader        = require('./loaders/ManagersLoader.js');

const mongoDB = config.dotEnv.MONGO_URI? require('./connect/mongo')({
    uri: config.dotEnv.MONGO_URI
}):null;

const cache = config.dotEnv.CACHE_REDIS
  ? require('./cache/cache.dbh')({
      prefix: config.dotEnv.CACHE_PREFIX,
      url: config.dotEnv.CACHE_REDIS
    })
  : null;

const cortex = (config.dotEnv.CORTEX_REDIS && config.dotEnv.CORTEX_TYPE !== 'memory')
  ? new Cortex({
      prefix: config.dotEnv.CORTEX_PREFIX,
      url: config.dotEnv.CORTEX_REDIS,
      type: config.dotEnv.CORTEX_TYPE,
      state: () => ({}),
      activeDelay: "50ms",
      idlDelay: "200ms",
    })
  : new Cortex({
      prefix: config.dotEnv.CORTEX_PREFIX,
      type: 'memory',
      state: () => ({}),
      activeDelay: "50ms",
      idlDelay: "200ms",
    });


const managersLoader = new ManagersLoader({config, cache, cortex});
const managers = managersLoader.load();

managers.userServer.run();
