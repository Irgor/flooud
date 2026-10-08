import fastify from './src/app.ts';

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' }, () => {
      console.log(`\n\n\n\n`);
      console.log(`====== START ======`);
      console.log(`Server Started at ${new Date().toLocaleTimeString()}`);
      console.log(`\n`);
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
