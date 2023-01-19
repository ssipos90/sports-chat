import 'module-alias/register';

(async () => {
  console.log('is this thing on');
})()
  .catch(err => {
    console.error(err);
    const x = [
      1,
      2,
      3,
    ];
    console.log(x);
    process.exit(1);
  });
