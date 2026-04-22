async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/users');
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error('Failed on 3001:', e.message);
  }
}
test();
