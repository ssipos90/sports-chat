import 'module-alias/register';
import { start } from './start';

start()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
