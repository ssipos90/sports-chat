import 'module-alias/register';
import { start } from './start';

process.on('uncaughtException', function (e) {
  console.error(e);
  process.exit(2);
});

start()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
