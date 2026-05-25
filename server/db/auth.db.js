const pool = require("../config");

const isValidTokenDb = async ({ tokenHash, token, email, curDate }) => {
  const { rows } = await pool.query(
    `
      SELECT EXISTS(select * from public."resetTokens" 
      where (token_hash = $1 OR token = $2) AND email = $3 AND expiration > $4 AND used = $5)
    `,
    [tokenHash, token, email, curDate, false]
  );
  return rows[0].exists;
};

const createResetTokenDb = async ({ email, expireDate, fpSalt, tokenHash }) => {
  await pool.query(
    'insert into public."resetTokens" (email, expiration, token, token_hash) values ($1, $2, $3, $4)',
    [email, expireDate, fpSalt, tokenHash]
  );

  return true;
};

const setTokenStatusDb = async (email) => {
  await pool.query(
    'update public."resetTokens" set used = $1 where email = $2',
    [true, email]
  );

  return true;
};

const deleteResetTokenDb = async (curDate) => {
  await pool.query('delete from public."resetTokens" where expiration <= $1', [
    curDate,
  ]);
  return true;
};

module.exports = {
  isValidTokenDb,
  createResetTokenDb,
  setTokenStatusDb,
  deleteResetTokenDb,
};
