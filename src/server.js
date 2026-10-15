const app = require('./app');
const env = require('./config/env');

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di ${env.appUrl}`);
  console.log(`📦 Environment: ${env.nodeEnv}`);
});
