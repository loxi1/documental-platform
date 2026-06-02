const bcrypt = require('bcrypt');

(async () => {
  const password = process.argv[2];

  if (!password) {
    console.error('Uso: node hash-password.js "MiPassword"');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  console.log(hash);
})();