import 'dotenv/config';

const token = process.argv[2];
if (!token) {
  console.log('Usage: node jwt_decoder.js <paste-your-token-here>');
  process.exit()
