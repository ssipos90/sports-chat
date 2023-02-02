function envStrict(key) {
  if (!(key in process.env)) {
    throw new Error(`Missing ${key} in process.`);
  }

  return process.env[key];
}

module.exports = {
  envStrict
};
